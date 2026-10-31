import type { SessionUser } from "@/lib/auth/session";
import { hasCapability, type Capability } from "@/lib/auth/roles";
import { bookingDuration } from "@/lib/booking-schedule";
import { WorkspaceError, type SalonWorkspace } from "@/lib/workspaces/model";
import type { Booking } from "@/types/salon";

/** Legacy records without an ID belong to their named/first branch. */
export function workspaceBranchOf(workspace: SalonWorkspace, item: { branchId?: string; branchName?: string }): string | undefined {
  return item.branchId ?? workspace.settings.branches.find((branch) => branch.name === item.branchName)?.id ?? workspace.settings.branches[0]?.id;
}

/** The only capabilities accepted for workspace mutations, checked again under the storage lock. */
export const ACTION_PERMISSIONS: Record<string, Capability> = {
  "booking.add": "bookings.create", "booking.edit": "bookings.edit", "booking.status": "bookings.status", "booking.delete": "bookings.delete",
  "schedule.block.add": "schedule.manage", "schedule.block.delete": "schedule.manage",
  "waitlist.add": "waitlist.manage", "waitlist.offer": "waitlist.manage", "waitlist.confirm": "waitlist.manage", "waitlist.decline": "waitlist.manage",
  "customer.save": "customers.manage", "customer.delete": "customers.manage", "public-booking.set": "registry.manage",
  "shop.product.save": "shop.manage", "shop.product.delete": "shop.manage", "shop.order.status": "shop.manage", "shop.order.delete": "shop.manage",
};

/**
 * Return only one branch's data. Cross-branch appointments for a shared staff
 * member become anonymous busy intervals: no customer, service, branch, price,
 * booking ID or notes leave the server. They are separate from booking lists
 * so dashboard counts and reports remain branch-only.
 */
export function scopeWorkspace(workspace: SalonWorkspace, user: SessionUser): SalonWorkspace | null {
  if (user.role === "owner") return workspace;
  if (!user.salonId || user.salonId !== workspace.id || !user.branchId) return null;
  const branch = workspace.settings.branches.find((item) => item.id === user.branchId);
  if (!branch) return null;
  const stylists = workspace.settings.stylists.filter((person) => !person.branchId || person.branchId === branch.id);
  const visibleStaff = new Map(stylists.map((person) => [person.id, person]));
  const externalBusy: Booking[] = [];
  for (const appointment of workspace.bookings) {
    if (appointment.status === "cancelled" || workspaceBranchOf(workspace, appointment) === branch.id) continue;
    const person = appointment.stylistId ? visibleStaff.get(appointment.stylistId) : stylists.find((item) => item.name === appointment.stylistName);
    // A currently branch-assigned stylist may still have an older appointment
    // in another branch after reassignment. The full server conflict check
    // protects that interval too, so include it without revealing details.
    if (!person) continue;
    externalBusy.push({
      id: `busy-${externalBusy.length}`, salonId: workspace.id, branchId: "other-branch",
      customerName: "Unavailable", customerPhone: "", serviceName: "Unavailable",
      stylistId: person.id, stylistName: person.name, date: appointment.date, time: appointment.time,
      durationMinutes: bookingDuration(appointment, workspace.settings.services), status: "confirmed",
      amountPKR: 0, channel: "direct", createdAt: "", isRecovered: false,
    });
  }
  const scheduleBlocks = (workspace.scheduleBlocks ?? []).flatMap((block) => {
    if (block.scope === "branch" && block.branchId !== branch.id) return [];
    if (block.scope === "staff" && (!visibleStaff.has(block.stylistId ?? "") || (block.branchId && block.branchId !== branch.id))) return [];
    // Global blocks can affect this branch, but their private note can describe
    // other locations. Staff cannot reopen those global blocks.
    if (block.scope === "salon" || (block.scope === "staff" && !block.branchId)) {
      const { note: _privateNote, ...safe } = block;
      return [safe];
    }
    return [block];
  });
  return {
    ...workspace,
    ownerName: "", email: "", whatsapp: "", images: [],
    settings: { ...workspace.settings, branches: [branch], stylists, activeBranchId: branch.id },
    bookings: workspace.bookings.filter((item) => workspaceBranchOf(workspace, item) === branch.id),
    waitlist: workspace.waitlist.filter((item) => workspaceBranchOf(workspace, item) === branch.id),
    repeatCustomers: workspace.repeatCustomers.filter((item) => workspaceBranchOf(workspace, item) === branch.id),
    hiddenCustomers: (workspace.hiddenCustomers ?? []).filter((item) => item.branchId === branch.id),
    scheduleBlocks, externalBusy,
    // Do not expose the high-water count for all branches.
    bookingSequence: undefined,
    // Shop orders are salon-wide and include delivery/contact details. Until
    // branch-specific fulfilment exists, only owners may access them.
    products: undefined, productOrders: undefined, productOrderSequence: undefined,
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Run on the full, latest workspace while its row is locked, before applying any action. */
export function assertWorkspaceAction(workspace: SalonWorkspace, user: SessionUser | null, input: unknown): asserts user is SessionUser {
  if (!user) throw new WorkspaceError("Ye account band hai. Owner se rabta karein.", 403);
  const action = record(input);
  const capability = typeof action.type === "string" ? ACTION_PERMISSIONS[action.type] : undefined;
  if (!capability) throw new WorkspaceError("Unknown workspace action.");
  if (!hasCapability(user.role, capability)) throw new WorkspaceError("Aap ke role ke paas is action ki permission nahi hai.", 403);
  if (user.role === "owner") return;
  const branchId = user.branchId;
  if (!branchId || user.salonId !== workspace.id || !workspace.settings.branches.some((branch) => branch.id === branchId)) {
    throw new WorkspaceError("Is branch ki permission nahi hai. Owner se assignment check karwayein.", 403);
  }
  const denied = () => { throw new WorkspaceError("Sirf apni assigned branch ke records badal sakte hain.", 403); };
  switch (action.type) {
    case "booking.add":
      if (record(action.booking).branchId !== branchId) denied();
      break;
    case "booking.edit": case "booking.status": case "booking.delete": {
      const current = workspace.bookings.find((item) => item.id === action.id);
      if (!current || workspaceBranchOf(workspace, current) !== branchId) denied();
      break;
    }
    case "waitlist.add":
      if (record(action.entry).branchId !== branchId) denied();
      break;
    case "waitlist.offer": case "waitlist.confirm": case "waitlist.decline": {
      const entry = workspace.waitlist.find((item) => item.id === action.id);
      if (!entry || workspaceBranchOf(workspace, entry) !== branchId || (action.type === "waitlist.confirm" && record(action.booking).branchId !== branchId)) denied();
      break;
    }
    case "schedule.block.add": {
      const block = record(action.block);
      if (block.scope === "branch") {
        if (block.branchId !== branchId) denied();
      } else if (block.scope === "staff") {
        const staff = workspace.settings.stylists.find((person) => person.id === block.stylistId);
        if (block.branchId !== branchId || !staff || (staff.branchId && staff.branchId !== branchId)) denied();
      } else denied();
      break;
    }
    case "schedule.block.delete": {
      const block = (workspace.scheduleBlocks ?? []).find((item) => item.id === action.id);
      if (!block || block.branchId !== branchId || (block.scope !== "branch" && block.scope !== "staff")) denied();
      break;
    }
    default:
      denied();
  }
}

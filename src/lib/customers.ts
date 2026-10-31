import type { SalonWorkspace } from "@/lib/workspaces/model";
import type { Booking } from "@/types/salon";

/** A directory identity is branch + normalized name; older bookings lack customer IDs. */
export function customerNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
export function customerBranchId(workspace: SalonWorkspace, item: { branchId?: string; branchName?: string }): string {
  return item.branchId ?? workspace.settings.branches.find((branch) => branch.name === item.branchName)?.id ?? workspace.settings.branches[0]?.id ?? "";
}
const keyFor = (branchId: string, name: string) => `${branchId}\u0000${customerNameKey(name)}`;

export type CustomerTarget = { branchId: string; name: string; recordId?: string };
export type CustomerDraft = { id: string; branchId: string; name: string; phone: string; notes: string };
export type CustomerProfile = CustomerTarget & {
  id: string; phone: string; lastService: string; lastVisitDate: string; visits: number;
  preferredStylist: string; notes: string; spend: number; bookings: Booking[]; isKnown: boolean;
};

/** Build branch-specific profiles, retaining legacy booking-derived guests. */
export function customerProfiles(workspace: SalonWorkspace, selectedBranch = "all"): CustomerProfile[] {
  const includeBranch = (branchId: string) => selectedBranch === "all" || branchId === selectedBranch;
  const hidden = new Set((workspace.hiddenCustomers ?? []).map((entry) => keyFor(entry.branchId, entry.nameKey)));
  const claimed = new Set<string>();
  const activeBookings = workspace.bookings.filter((booking) => booking.status !== "cancelled" && includeBranch(customerBranchId(workspace, booking)));
  const known = workspace.repeatCustomers.flatMap((customer) => {
    const branchId = customerBranchId(workspace, customer);
    if (!includeBranch(branchId)) return [];
    const names = [customer.name, ...(customer.aliases ?? [])];
    names.forEach((name) => claimed.add(keyFor(branchId, name)));
    const nameKeys = new Set(names.map(customerNameKey));
    const history = activeBookings.filter((booking) => customerBranchId(workspace, booking) === branchId && nameKeys.has(customerNameKey(booking.customerName)));
    return [{
      id: customer.id, recordId: customer.id, branchId, name: customer.name, phone: customer.phone,
      lastService: customer.lastService, lastVisitDate: customer.lastVisitDate,
      visits: Math.max(customer.totalVisits, history.length), preferredStylist: customer.preferredStylist,
      notes: customer.notes ?? "", spend: history.reduce((sum, booking) => sum + booking.amountPKR, 0),
      bookings: history, isKnown: true,
    }];
  });
  const grouped = new Map<string, Booking[]>();
  for (const booking of activeBookings) {
    const branchId = customerBranchId(workspace, booking);
    const key = keyFor(branchId, booking.customerName);
    if (claimed.has(key) || hidden.has(key)) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), booking]);
  }
  const guests: CustomerProfile[] = [...grouped.entries()].map(([key, history]) => {
    const booking = history[0];
    return {
      id: `guest:${key}`, branchId: customerBranchId(workspace, booking), name: booking.customerName,
      phone: booking.customerPhone, lastService: booking.serviceName, lastVisitDate: booking.date,
      visits: history.length, preferredStylist: booking.stylistName, notes: "", spend: history.reduce((sum, row) => sum + row.amountPKR, 0), bookings: history, isKnown: false,
    };
  });
  return [...known, ...guests];
}

import { INITIAL_BOOKINGS, INITIAL_REPEAT_CUSTOMERS, INITIAL_SALON_SETTINGS, INITIAL_WAITLIST } from "@/lib/constants";
import { sampleProducts } from "@/lib/sample-products";
import type { RegisteredSalonImage } from "@/types/registry";
import { customerBranchId, customerNameKey, customerProfiles, type CustomerDraft, type CustomerTarget } from "@/lib/customers";
import type { Booking, RepeatCustomer, SalonSettings, ScheduleBlock, ServiceCategory, WaitlistEntry } from "@/types/salon";
import { PRODUCT_CATEGORIES, type ProductCategory, type ProductDraft, type ProductOrder, type ProductOrderStatus, type SalonProduct } from "@/types/shop";
import { blockConflictsWithBooking, bookingDuration, bookingReference, findBookingConflict, findScheduleClosure, isCalendarDate, karachiToday, parseClockTime, scheduleDateKey } from "@/lib/booking-schedule";

/** One installation has an owner and a collection of independently selected salons. */
export type WorkspaceProfile = {
  id: string;
  /** Optimistic version of the profile, independent of booking actions. */
  profileVersion: number;
  settings: SalonSettings;
  ownerName: string;
  email: string;
  whatsapp: string;
  images: RegisteredSalonImage[];
};

export type SalonWorkspace = WorkspaceProfile & {
  createdAt: string;
  isSample: boolean;
  /** Public intake is explicitly enabled per salon, never on by default. */
  publicBookingEnabled?: boolean;
  /** Salon-wide shop catalog and owner-only manual order requests. */
  products?: SalonProduct[];
  productOrders?: ProductOrder[];
  productOrderSequence?: number;
  bookings: Booking[];
  /** High-water mark: references are never reused, even after deletion. */
  bookingSequence?: number;
  /** Explicit holiday, off-day and timed closures; absent in older documents. */
  scheduleBlocks?: ScheduleBlock[];
  waitlist: WaitlistEntry[];
  repeatCustomers: RepeatCustomer[];
  /** Redacted cross-branch busy intervals, returned only to branch-restricted staff. Never persisted. */
  externalBusy?: Booking[];
  /** Directory exclusions preserve booking history without resurrecting deleted profiles. */
  hiddenCustomers?: { branchId: string; nameKey: string }[];
};

export type WorkspaceAction =
  | { type: "booking.add"; booking: Booking }
  | { type: "booking.edit"; id: string; patch: Partial<Booking> }
  | { type: "booking.status"; id: string; status: "cancelled" | "completed" }
  | { type: "booking.delete"; id: string }
  | { type: "schedule.block.add"; block: ScheduleBlock }
  | { type: "schedule.block.delete"; id: string }
  | { type: "waitlist.add"; entry: WaitlistEntry }
  | { type: "waitlist.offer"; id: string }
  | { type: "waitlist.decline"; id: string }
  | { type: "waitlist.confirm"; id: string; booking: Booking }
  | { type: "customer.save"; customer: CustomerDraft; previous?: CustomerTarget }
  | { type: "customer.delete"; target: CustomerTarget }
  | { type: "public-booking.set"; enabled: boolean }
  | { type: "shop.product.save"; product: ProductDraft }
  | { type: "shop.product.delete"; id: string; version: number }
  | { type: "shop.order.status"; id: string; status: ProductOrderStatus }
  | { type: "shop.order.delete"; id: string };

export class WorkspaceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const CATEGORIES: ServiceCategory[] = ["Hair", "Skin & Facial", "Makeup & Bridal", "Nails"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CHANNELS = ["whatsapp_night", "missed_call", "overflow_peak", "waitlist", "direct"];
const IMAGE_KINDS = ["logo", "interior", "team", "service", "other"];

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new WorkspaceError(`${label} sahi nahi hai.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 200, required = false): string {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new WorkspaceError(`${label} sahi likhein (max ${max} characters).`);
  return value.trim();
}
function optionalText(value: unknown, label: string, max = 200): string {
  return value === undefined || value === null ? "" : text(value, label, max);
}
function id(value: unknown, label: string): string {
  const result = text(value, label, 100, true);
  if (!/^[a-zA-Z0-9_-]+$/.test(result)) throw new WorkspaceError(`${label} sahi nahi hai.`);
  return result;
}
function list(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new WorkspaceError(`${label} ki list sahi nahi hai.`);
  return value;
}
function unique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) throw new WorkspaceError(`${label} mein duplicate entries hain.`);
}
function number(value: unknown, label: string, max: number, min = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new WorkspaceError(`${label} sahi number mein likhein.`);
  return value;
}
function image(value: unknown, label: string): string {
  const result = optionalText(value, label, 350_000);
  if (result && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(result) && !/^\/images\/[a-zA-Z0-9._-]+$/.test(result)) {
    throw new WorkspaceError(`${label}: sirf JPG, PNG ya WebP images allowed hain.`);
  }
  return result;
}

/** Validate/whitelist all profile fields on the server; operational records are never accepted here. */
export function normalizeProfile(value: unknown): WorkspaceProfile {
  const raw = object(value, "Salon profile");
  const settings = object(raw.settings, "Salon settings");
  const workspaceId = id(raw.id, "Salon ID");
  const profileVersion = number(raw.profileVersion, "Profile version", 1_000_000_000);
  if (!Number.isInteger(profileVersion)) throw new WorkspaceError("Profile version sahi nahi hai.");
  if (settings.id !== workspaceId) throw new WorkspaceError("Salon ID match nahi karta.");
  const branches = list(settings.branches, "Branches", 30).map((item) => {
    const branch = object(item, "Branch");
    return { id: id(branch.id, "Branch ID"), name: text(branch.name, "Branch name", 120, true), area: optionalText(branch.area, "Branch area", 160) };
  });
  if (branches.length === 0) throw new WorkspaceError("Kam az kam ek branch zaroori hai.");
  unique(branches.map((branch) => branch.id), "Branch ID");
  unique(branches.map((branch) => branch.name.toLowerCase()), "Branch name");
  const branchIds = new Set(branches.map((branch) => branch.id));
  const stylists = list(settings.stylists, "Staff", 100).map((item) => {
    const stylist = object(item, "Staff");
    const branchId = optionalText(stylist.branchId, "Staff branch", 100);
    if (branchId && !branchIds.has(branchId)) throw new WorkspaceError("Staff ke liye maujood branch select karein.");
    const availableDays = list(stylist.availableDays, "Available days", 7).map((day) => text(day, "Day", 20));
    if (availableDays.some((day) => !DAYS.includes(day))) throw new WorkspaceError("Staff ke available days sahi chunein.");
    const photoDataUrl = image(stylist.photoDataUrl, "Staff photo");
    return { id: id(stylist.id, "Staff ID"), name: text(stylist.name, "Staff name", 120, true), specialty: optionalText(stylist.specialty, "Specialty", 160), availableDays, ...(branchId ? { branchId } : {}), ...(photoDataUrl ? { photoDataUrl } : {}) };
  });
  unique(stylists.map((stylist) => stylist.id), "Staff ID");
  const services = list(settings.services, "Services", 150).map((item) => {
    const service = object(item, "Service");
    if (typeof service.category !== "string" || !CATEGORIES.includes(service.category as ServiceCategory)) throw new WorkspaceError("Service category sahi chunein.");
    return { id: id(service.id, "Service ID"), name: text(service.name, "Service name", 160, true), category: service.category as ServiceCategory, pricePKR: number(service.pricePKR, "Price", 100_000_000), durationMinutes: number(service.durationMinutes, "Duration", 1440, 1), description: optionalText(service.description, "Description", 500) };
  });
  unique(services.map((service) => service.id), "Service ID");
  const offDays = list(settings.offDays, "Off days", 7).map((day) => text(day, "Day", 20));
  if (offDays.some((day) => !DAYS.includes(day))) throw new WorkspaceError("Off days sahi chunein.");
  const images = list(raw.images, "Images", 8).map((item) => {
    const photo = object(item, "Image");
    if (typeof photo.kind !== "string" || !IMAGE_KINDS.includes(photo.kind)) throw new WorkspaceError("Image type sahi chunein.");
    const dataUrl = image(photo.dataUrl, "Salon image");
    if (!dataUrl) throw new WorkspaceError("Image missing hai.");
    return { id: id(photo.id, "Image ID"), name: text(photo.name, "Image name", 160, true), kind: photo.kind as RegisteredSalonImage["kind"], dataUrl, sizeBytes: number(photo.sizeBytes, "Image size", 10_000_000), uploadedAt: text(photo.uploadedAt, "Upload date", 80, true) };
  });
  unique(images.map((item) => item.id), "Image ID");
  const activeBranchId = branchIds.has(String(settings.activeBranchId)) ? String(settings.activeBranchId) : branches[0].id;
  const normalized: WorkspaceProfile = {
    id: workspaceId,
    profileVersion,
    ownerName: optionalText(raw.ownerName, "Owner name", 120),
    email: optionalText(raw.email, "Email", 200),
    whatsapp: optionalText(raw.whatsapp, "WhatsApp", 50),
    images,
    settings: {
      id: workspaceId,
      name: text(settings.name, "Salon name", 160, true),
      city: text(settings.city, "City", 100, true),
      area: optionalText(settings.area, "Area", 160),
      address: optionalText(settings.address, "Address", 300),
      phone: optionalText(settings.phone, "Phone", 50),
      openingTime: text(settings.openingTime, "Opening time", 30, true),
      closingTime: text(settings.closingTime, "Closing time", 30, true),
      offDays,
      greetingMessage: optionalText(settings.greetingMessage, "Greeting", 1000),
      repeatGreetingTemplate: optionalText(settings.repeatGreetingTemplate, "Repeat greeting", 1000),
      googleReviewUrl: optionalText(settings.googleReviewUrl, "Review link", 500),
      branches, stylists, services, activeBranchId,
    },
  };
  if (JSON.stringify(normalized).length > 2_500_000) throw new WorkspaceError("Profile bohat bara hai. Kuch images remove karein.");
  return normalized;
}


/**
 * Upgrade legacy UUID-only records without changing their internal IDs. A read
 * requiring this migration is rechecked and persisted under the workspace lock.
 * Existing numeric sample IDs are retained as their references where possible.
 */
export function withBookingReferences(workspace: SalonWorkspace): SalonWorkspace {
  const numeric = (value: string | undefined): number => {
    const match = value?.match(/^BK-(\d{1,16})$/i);
    const number = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(number) && number > 0 ? number : 0;
  };
  const format = (value: number) => `BK-${String(value).padStart(4, "0")}`;
  let sequence = Number.isSafeInteger(workspace.bookingSequence) && (workspace.bookingSequence ?? 0) >= 0 ? workspace.bookingSequence! : 0;
  for (const booking of workspace.bookings) sequence = Math.max(sequence, numeric(booking.reference), numeric(booking.id));
  const assigned = new Map<string, string>();
  const used = new Set<number>();
  // Previously assigned references win over an old record's numeric ID.
  for (const booking of workspace.bookings) {
    const value = numeric(booking.reference);
    if (value && !used.has(value)) { assigned.set(booking.id, format(value)); used.add(value); }
  }
  for (const booking of workspace.bookings) {
    if (assigned.has(booking.id)) continue;
    const value = numeric(booking.id);
    if (value && !used.has(value)) { assigned.set(booking.id, format(value)); used.add(value); }
  }
  const bookings = workspace.bookings.map((booking) => {
    let reference = assigned.get(booking.id);
    if (!reference) {
      if (sequence >= Number.MAX_SAFE_INTEGER) throw new WorkspaceError("Booking reference limit reached.", 409);
      reference = format(++sequence);
    }
    return booking.reference === reference ? booking : { ...booking, reference };
  });
  return workspace.bookingSequence === sequence && bookings.every((item, index) => item === workspace.bookings[index])
    ? workspace : { ...workspace, bookings, bookingSequence: sequence };
}

function nextBookingReference(workspace: SalonWorkspace): { bookingSequence: number; reference: string } {
  const next = (workspace.bookingSequence ?? 0) + 1;
  if (!Number.isSafeInteger(next)) throw new WorkspaceError("Booking reference limit reached.", 409);
  return { bookingSequence: next, reference: `BK-${String(next).padStart(4, "0")}` };
}

export function sampleWorkspace(): SalonWorkspace {
  const settings = structuredClone(INITIAL_SALON_SETTINGS);
  settings.name = "Your salon";
  settings.area = settings.city;
  settings.stylists = settings.stylists.map((stylist, index) => index === 1 ? { ...stylist } : { ...stylist, branchId: index === 0 ? "br-1" : "br-2" });
  const bookings = INITIAL_BOOKINGS.map((booking) => ({ ...booking, branchId: settings.branches.find((branch) => branch.name === booking.branchName)?.id ?? settings.branches[0].id }));
  return withBookingReferences({
    id: settings.id, profileVersion: 1, settings, ownerName: "Demo Owner", email: "owner@glowsalon.example", whatsapp: "", images: [],
    createdAt: "2026-10-28T08:45:00Z", isSample: true,
    bookings,
    waitlist: INITIAL_WAITLIST.map((entry, index) => ({ ...entry, branchId: index === 0 ? "br-2" : "br-1" })),
    repeatCustomers: INITIAL_REPEAT_CUSTOMERS.map((customer) => ({ ...customer, branchId: bookings.find((booking) => booking.customerName === customer.name)?.branchId ?? "br-1" })),
    scheduleBlocks: [],
    products: sampleProducts(), productOrders: [], productOrderSequence: 0,
  });
}

export function newWorkspaceProfile(workspaceId: string): WorkspaceProfile {
  const branchId = `branch-${workspaceId}`;
  return {
    id: workspaceId, profileVersion: 0, ownerName: "", email: "", whatsapp: "", images: [],
    settings: { ...structuredClone(INITIAL_SALON_SETTINGS), id: workspaceId, name: "", city: "Lahore", area: "", address: "", phone: "", services: [], stylists: [], branches: [{ id: branchId, name: "Main branch", area: "" }], activeBranchId: branchId },
  };
}

export function createWorkspace(profile: WorkspaceProfile): SalonWorkspace {
  if (profile.profileVersion !== 0) throw new WorkspaceError("Naye salon ka profile version sahi nahi hai.", 409);
  return { ...profile, profileVersion: 1, createdAt: new Date().toISOString(), isSample: false, bookings: [], bookingSequence: 0, scheduleBlocks: [], waitlist: [], repeatCustomers: [] };
}

/** Branch removal is explicit/destructive; retained bookings follow branch renames by ID. */
export function applyProfile(workspace: SalonWorkspace, profile: WorkspaceProfile): SalonWorkspace {
  const currentVersion = workspace.profileVersion ?? 1; // Existing documents predate versioning.
  if (profile.profileVersion !== currentVersion) throw new WorkspaceError("Profile kisi aur session mein badal gaya. Overview mein Refresh data karein aur phir dobara edit karein.", 409);
  const branches = new Map(profile.settings.branches.map((branch) => [branch.id, branch]));
  const oldBranches = new Map(workspace.settings.branches.map((branch) => [branch.name, branch.id]));
  const staff = new Map(profile.settings.stylists.map((person) => [person.id, person]));
  const services = new Map(profile.settings.services.map((service) => [service.id, service]));
  const oldStaffByName = new Map(workspace.settings.stylists.map((person) => [person.name, person.id]));
  const oldServiceByName = new Map(workspace.settings.services.map((service) => [service.name, service.id]));
  const branchOf = (item: { branchId?: string; branchName?: string }) => item.branchId ?? (item.branchName ? oldBranches.get(item.branchName) : undefined) ?? workspace.settings.branches[0]?.id;
  return {
    ...workspace, ...profile, profileVersion: currentVersion + 1,
    bookings: workspace.bookings.flatMap((booking) => {
      const branchId = branchOf(booking);
      const branch = branchId ? branches.get(branchId) : undefined;
      if (!branch) return [];
      const person = staff.get(booking.stylistId ?? oldStaffByName.get(booking.stylistName) ?? "");
      const service = services.get(booking.serviceId ?? oldServiceByName.get(booking.serviceName) ?? "");
      return [{ ...booking, branchId: branch.id, branchName: branch.name, stylistName: person?.name ?? booking.stylistName, serviceName: service?.name ?? booking.serviceName }];
    }),
    scheduleBlocks: (workspace.scheduleBlocks ?? []).filter((block) => block.scope === "salon" || (block.scope === "branch" ? branches.has(block.branchId ?? "") : staff.has(block.stylistId ?? "") && (!block.branchId || branches.has(block.branchId)))),
    hiddenCustomers: (workspace.hiddenCustomers ?? []).filter((item) => branches.has(item.branchId)),
    waitlist: workspace.waitlist.filter((entry) => branches.has(branchOf(entry) ?? "")).map((entry) => ({ ...entry, serviceName: services.get(oldServiceByName.get(entry.serviceName) ?? "")?.name ?? entry.serviceName })),
    repeatCustomers: workspace.repeatCustomers.filter((entry) => branches.has(branchOf(entry) ?? "")).map((entry) => ({ ...entry, preferredStylist: staff.get(oldStaffByName.get(entry.preferredStylist) ?? "")?.name ?? entry.preferredStylist })),
  };
}

function normalizeBooking(value: unknown, workspace: SalonWorkspace): Booking {
  const raw = object(value, "Booking");
  const branchId = id(raw.branchId, "Branch ID");
  const branch = workspace.settings.branches.find((item) => item.id === branchId);
  if (!branch) throw new WorkspaceError("Booking ke liye sahi branch select karein.");
  if (!CHANNELS.includes(String(raw.channel))) throw new WorkspaceError("Booking channel sahi chunein.");
  if (!["confirmed", "completed", "cancelled"].includes(String(raw.status))) throw new WorkspaceError("Booking status sahi chunein.");
  const serviceId = optionalText(raw.serviceId, "Service ID", 100);
  const stylistId = optionalText(raw.stylistId, "Staff ID", 100);
  const time = text(raw.time, "Time", 50, true);
  if (parseClockTime(time) === null) throw new WorkspaceError("Time sahi likhein, jaise 04:30 PM.");
  const date = scheduleDateKey(text(raw.date, "Date", 80, true));
  if (!isCalendarDate(date)) throw new WorkspaceError("Date sahi chunein.");
  const durationMinutes = raw.durationMinutes === undefined ? undefined : number(raw.durationMinutes, "Duration", 1440, 1);
  return {
    id: id(raw.id, "Booking ID"), salonId: workspace.id, branchId, branchName: branch.name,
    customerName: text(raw.customerName, "Customer name", 160, true), customerPhone: optionalText(raw.customerPhone, "Customer phone", 50),
    ...(serviceId ? { serviceId } : {}), serviceName: text(raw.serviceName, "Service name", 160, true),
    ...(durationMinutes ? { durationMinutes } : {}),
    ...(stylistId ? { stylistId } : {}), stylistName: text(raw.stylistName, "Stylist name", 160, true),
    date, time,
    status: raw.status as Booking["status"], amountPKR: number(raw.amountPKR, "Amount", 100_000_000), channel: raw.channel as Booking["channel"],
    createdAt: text(raw.createdAt, "Created date", 80, true), isRecovered: raw.isRecovered === true,
    ...(raw.notes ? { notes: text(raw.notes, "Notes", 1000) } : {}),
  };
}

/** Pure, shared mutation logic. A server transaction calls this under a row lock. */
export function applyAction(workspace: SalonWorkspace, input: unknown): SalonWorkspace {
  workspace = withBookingReferences(workspace);
  const action = object(input, "Action");
  const actionId = () => id(action.id, "Record ID");
  const assertSlotFree = (booking: Booking, excludeId?: string) => {
    const conflict = findBookingConflict(workspace.bookings, workspace.settings.services, booking.stylistName, booking.date, booking.time, excludeId, {
      stylistId: booking.stylistId, durationMinutes: bookingDuration(booking, workspace.settings.services),
    });
    if (conflict) {
      const conflictBranch = conflict.branchId ?? workspace.settings.branches.find((branch) => branch.name === conflict.branchName)?.id ?? workspace.settings.branches[0]?.id;
      // Never expose another branch's customer in a conflict response.
      throw new WorkspaceError(conflictBranch !== booking.branchId ? "Ye staff is waqt available nahi hai. Doosra slot chunein." : `Ye slot already booked hai (${conflict.customerName}, ${conflict.time}).`, 409);
    }
    const closure = findScheduleClosure(workspace.settings, workspace.scheduleBlocks ?? [], {
      branchId: booking.branchId, stylistId: booking.stylistId, stylistName: booking.stylistName,
    }, booking.date, booking.time, bookingDuration(booking, workspace.settings.services));
    if (closure) {
      // A global closure's private note may concern another branch. The
      // schedule displays authorized notes separately; conflict errors do not.
      const safeLabel = closure.kind === "block" ? (closure.block?.reason ?? "Time off") : closure.label;
      throw new WorkspaceError(`Ye time closed hai — ${safeLabel}. Doosra time chunein.`, 409);
    }
  };
  if (action.type === "shop.product.save") {
    const raw = object(action.product, "Product");
    const productId = id(raw.id, "Product ID");
    const name = text(raw.name, "Product name", 120, true);
    if (typeof raw.category !== "string" || !PRODUCT_CATEGORIES.includes(raw.category as ProductCategory)) throw new WorkspaceError("Product category sahi chunein.");
    const description = optionalText(raw.description, "Product description", 500);
    const pricePKR = number(raw.pricePKR, "Product price", 10_000_000, 1);
    if (!Number.isSafeInteger(pricePKR)) throw new WorkspaceError("Price poore rupees mein likhein.");
    if (typeof raw.published !== "boolean") throw new WorkspaceError("Product visibility sahi chunein.");
    const version = number(raw.version, "Product version", 1_000_000_000);
    if (!Number.isInteger(version)) throw new WorkspaceError("Product version sahi nahi hai.");
    const imageDataUrl = image(raw.imageDataUrl, "Product photo");
    const products = workspace.products ?? [];
    const existing = products.find((item) => item.id === productId);
    if (existing ? version !== existing.version : version !== 0) throw new WorkspaceError("Product badal gaya hai. Refresh karke dobara edit karein.", 409);
    if (!existing && products.length >= 40) throw new WorkspaceError("Ek salon mein 40 products tak add kar sakte hain.", 409);
    const now = new Date().toISOString();
    const product: SalonProduct = { id: productId, name, category: raw.category as ProductCategory, description, pricePKR, published: raw.published, version: version + 1, createdAt: existing?.createdAt ?? now, updatedAt: now, ...(imageDataUrl ? { imageDataUrl } : {}) };
    const next = existing ? products.map((item) => item.id === productId ? product : item) : [product, ...products];
    if (next.reduce((total, item) => total + (item.imageDataUrl?.length ?? 0), 0) > 2_000_000) throw new WorkspaceError("Product photos ki limit poori ho gayi. Kuch photos remove karein.", 409);
    return { ...workspace, products: next };
  }
  if (action.type === "shop.product.delete") {
    const productId = actionId();
    const product = (workspace.products ?? []).find((item) => item.id === productId);
    if (!product) throw new WorkspaceError("Product nahi mila.", 404);
    if (action.version !== product.version) throw new WorkspaceError("Product badal gaya hai. Refresh karke dobara try karein.", 409);
    // Existing orders keep their original product name and price snapshot.
    return { ...workspace, products: (workspace.products ?? []).filter((item) => item.id !== productId) };
  }
  if (action.type === "shop.order.status" || action.type === "shop.order.delete") {
    const orderId = actionId();
    const orders = workspace.productOrders ?? [];
    const order = orders.find((item) => item.id === orderId);
    if (!order) throw new WorkspaceError("Order nahi mila. Refresh karein.", 404);
    if (action.type === "shop.order.delete") {
      if (order.status !== "fulfilled" && order.status !== "cancelled") throw new WorkspaceError("Pehle order fulfill ya cancel karein.", 409);
      return { ...workspace, productOrders: orders.filter((item) => item.id !== orderId) };
    }
    const allowed: Record<ProductOrderStatus, ProductOrderStatus[]> = { pending: ["confirmed", "cancelled"], confirmed: ["fulfilled", "cancelled"], fulfilled: [], cancelled: [] };
    if (typeof action.status !== "string" || !allowed[order.status]?.includes(action.status as ProductOrderStatus)) throw new WorkspaceError("Order status badal chuka hai. Refresh karein.", 409);
    return { ...workspace, productOrders: orders.map((item) => item.id === orderId ? { ...item, status: action.status as ProductOrderStatus } : item) };
  }
  if (action.type === "public-booking.set") {
    if (typeof action.enabled !== "boolean") throw new WorkspaceError("Booking link setting sahi chunein.");
    return { ...workspace, publicBookingEnabled: action.enabled };
  }
  if (action.type === "customer.save" || action.type === "customer.delete") {
    // Profiles may be saved records or guests derived from legacy booking names.
    // Deletion hides those names from the directory but retains the appointments.
    const targetValue = action.type === "customer.delete" ? action.target : action.previous;
    const profiles = customerProfiles(workspace);
    let previous: typeof profiles[number] | undefined;
    if (targetValue !== undefined) {
      const target = object(targetValue, "Customer target");
      const targetBranch = id(target.branchId, "Branch ID");
      const targetName = text(target.name, "Customer name", 160, true);
      const recordId = optionalText(target.recordId, "Customer ID", 100);
      previous = profiles.find((profile) => profile.branchId === targetBranch && customerNameKey(profile.name) === customerNameKey(targetName) && (recordId ? profile.recordId === recordId : !profile.recordId));
      if (!previous) throw new WorkspaceError("Customer nahi mila. Refresh karein.", 404);
    }
    if (action.type === "customer.delete") {
      if (!previous) throw new WorkspaceError("Customer nahi mila.", 404);
      const saved = previous.recordId ? workspace.repeatCustomers.find((item) => item.id === previous!.recordId) : undefined;
      const names = [previous.name, ...(saved?.aliases ?? [])].map(customerNameKey);
      const hidden = [...(workspace.hiddenCustomers ?? [])];
      for (const nameKey of names) {
        // Only historical appointments need an exclusion. A manual customer
        // with no bookings should not leave a name behind on deletion.
        const hasHistory = workspace.bookings.some((booking) => customerBranchId(workspace, booking) === previous!.branchId && customerNameKey(booking.customerName) === nameKey);
        if (hasHistory && !hidden.some((entry) => entry.branchId === previous!.branchId && entry.nameKey === nameKey)) hidden.push({ branchId: previous.branchId, nameKey });
      }
      return { ...workspace, repeatCustomers: workspace.repeatCustomers.filter((item) => item.id !== previous!.recordId), hiddenCustomers: hidden };
    }
    const raw = object(action.customer, "Customer");
    const customerId = id(raw.id, "Customer ID");
    const branchId = id(raw.branchId, "Branch ID");
    const name = text(raw.name, "Customer name", 160, true);
    const phone = optionalText(raw.phone, "Customer phone", 50);
    const notes = optionalText(raw.notes, "Notes", 1000);
    if (!workspace.settings.branches.some((branch) => branch.id === branchId)) throw new WorkspaceError("Customer ke liye sahi branch select karein.");
    if (previous && previous.branchId !== branchId) throw new WorkspaceError("Existing customer ki branch badal nahi sakte.");
    if (previous?.recordId && customerId !== previous.recordId) throw new WorkspaceError("Customer ID match nahi karta.");
    if (workspace.repeatCustomers.some((item) => item.id === customerId && item.id !== previous?.recordId)) throw new WorkspaceError("Customer ID already exists.", 409);
    const clash = profiles.find((profile) => profile.branchId === branchId && customerNameKey(profile.name) === customerNameKey(name) && profile.id !== previous?.id);
    const aliasClash = workspace.repeatCustomers.some((item) => item.id !== previous?.recordId && customerBranchId(workspace, item) === branchId && (item.aliases ?? []).some((alias) => customerNameKey(alias) === customerNameKey(name)));
    if (clash || aliasClash) throw new WorkspaceError("Is branch mein isi naam ka customer pehle se hai. Us profile ko edit karein.", 409);
    const existing = previous?.recordId ? workspace.repeatCustomers.find((item) => item.id === previous!.recordId) : undefined;
    const aliases = [...new Set([...(existing?.aliases ?? []), ...(previous && customerNameKey(previous.name) !== customerNameKey(name) ? [previous.name] : [])])].filter((alias) => customerNameKey(alias) !== customerNameKey(name));
    if (aliases.length > 30) throw new WorkspaceError("Customer name changes ki limit poori ho gayi hai.", 409);
    const saved: RepeatCustomer = {
      id: customerId, salonId: workspace.id, branchId, name, phone, notes,
      lastVisitDate: existing?.lastVisitDate ?? previous?.lastVisitDate ?? "", lastService: existing?.lastService ?? previous?.lastService ?? "",
      totalVisits: existing?.totalVisits ?? 0, preferredStylist: existing?.preferredStylist ?? previous?.preferredStylist ?? "",
      ...(aliases.length ? { aliases } : {}),
    };
    return {
      ...workspace,
      repeatCustomers: [saved, ...workspace.repeatCustomers.filter((item) => item.id !== saved.id)],
      hiddenCustomers: (workspace.hiddenCustomers ?? []).filter((entry) => entry.branchId !== branchId || customerNameKey(entry.nameKey) !== customerNameKey(name)),
    };
  }
  if (action.type === "booking.add" || action.type === "waitlist.confirm") {
    const booking = normalizeBooking(action.booking, workspace);
    if (workspace.bookings.some((item) => item.id === booking.id)) throw new WorkspaceError("Booking ID already exists.", 409);
    if (action.type === "booking.add") {
      if (booking.status !== "confirmed") throw new WorkspaceError("Nayi booking confirmed honi chahiye.");
      const stylist = workspace.settings.stylists.find((person) => booking.stylistId ? person.id === booking.stylistId : person.name === booking.stylistName);
      const service = workspace.settings.services.find((item) => booking.serviceId ? item.id === booking.serviceId : item.name === booking.serviceName);
      if (!stylist || stylist.name !== booking.stylistName || (stylist.branchId && stylist.branchId !== booking.branchId)) throw new WorkspaceError("Is branch ke liye sahi staff select karein.");
      if (!service || service.name !== booking.serviceName) throw new WorkspaceError("Salon menu se sahi service select karein.");
      // Snapshot duration from the trusted salon menu; client input cannot shorten it.
      const confirmed = { ...booking, stylistId: stylist.id, serviceId: service.id, durationMinutes: service.durationMinutes };
      assertSlotFree(confirmed);
      const { bookingSequence, reference } = nextBookingReference(workspace);
      return { ...workspace, bookingSequence, bookings: [{ ...confirmed, reference }, ...workspace.bookings] };
    }
    const entryId = actionId();
    const entry = workspace.waitlist.find((item) => item.id === entryId);
    if (!entry || (entry.status !== "offered" && !(entry.source === "website" && entry.status === "waiting"))) throw new WorkspaceError("Pending waitlist request nahi mili.", 404);
    if (booking.branchId !== (entry.branchId ?? workspace.settings.branches[0].id)) throw new WorkspaceError("Waitlist branch match nahi karti.");
    const service = workspace.settings.services.find((item) => entry.serviceId ? item.id === entry.serviceId : item.name === entry.serviceName);
    const stylist = workspace.settings.stylists.find((person) => booking.stylistId ? person.id === booking.stylistId : person.name === booking.stylistName);
    if (!stylist || stylist.name !== booking.stylistName || (stylist.branchId && stylist.branchId !== booking.branchId)) throw new WorkspaceError("Is branch ke liye sahi staff select karein.");
    if (!service) throw new WorkspaceError("Waitlist service salon menu mein nahi hai.");
    const confirmed = { ...booking, stylistId: stylist.id, customerName: entry.customerName, customerPhone: entry.customerPhone, serviceId: service.id, serviceName: service.name, durationMinutes: service.durationMinutes, amountPKR: service.pricePKR, status: "confirmed" as const, channel: "waitlist" as const, isRecovered: entry.source !== "website" };
    assertSlotFree(confirmed);
    const { bookingSequence, reference } = nextBookingReference(workspace);
    return { ...workspace, bookingSequence, bookings: [{ ...confirmed, reference }, ...workspace.bookings], waitlist: workspace.waitlist.map((item) => item.id === entryId ? { ...item, status: "booked" } : item) };
  }
  if (action.type === "booking.edit" || action.type === "booking.status" || action.type === "booking.delete") {
    const bookingId = actionId();
    const current = workspace.bookings.find((item) => item.id === bookingId);
    if (!current) throw new WorkspaceError("Booking nahi mili.", 404);
    if (action.type === "booking.delete") return { ...workspace, bookings: workspace.bookings.filter((item) => item.id !== bookingId) };
    let next: Booking;
    if (action.type === "booking.status") {
      if (action.status !== "cancelled" && action.status !== "completed") throw new WorkspaceError("Status sahi chunein.");
      next = { ...current, status: action.status };
    } else {
      const patch = object(action.patch, "Booking changes");
      const allowed = ["customerName", "customerPhone", "serviceId", "serviceName", "stylistId", "stylistName", "date", "time", "status", "amountPKR", "channel", "notes"];
      if (Object.keys(patch).some((key) => !allowed.includes(key))) throw new WorkspaceError("Ye booking field edit nahi ho sakti.");
      next = { ...normalizeBooking({ ...current, ...patch }, workspace), reference: current.reference };
      if (next.serviceId !== current.serviceId || next.serviceName !== current.serviceName) {
        const service = workspace.settings.services.find((item) => next.serviceId ? item.id === next.serviceId : item.name === next.serviceName);
        if (!service || service.name !== next.serviceName) throw new WorkspaceError("Salon menu se sahi service select karein.");
        next.durationMinutes = service.durationMinutes;
      }
      if (next.stylistId !== current.stylistId || next.stylistName !== current.stylistName) {
        const stylist = workspace.settings.stylists.find((person) => next.stylistId ? person.id === next.stylistId : person.name === next.stylistName);
        if (!stylist || stylist.name !== next.stylistName || (stylist.branchId && stylist.branchId !== next.branchId)) throw new WorkspaceError("Is branch ke liye sahi staff select karein.");
        next.stylistId = stylist.id;
      }
    }
    // Existing historical overlaps should not prevent status/name corrections;
    // check conflicts when the schedule or service changes, or on reactivation.
    const scheduleChanged = next.stylistId !== current.stylistId || next.stylistName !== current.stylistName || scheduleDateKey(next.date) !== scheduleDateKey(current.date) || next.time !== current.time || next.serviceId !== current.serviceId || next.serviceName !== current.serviceName;
    if (next.status !== "cancelled" && (scheduleChanged || current.status === "cancelled")) assertSlotFree(next, bookingId);
    let waitlist = workspace.waitlist;
    if (action.type === "booking.status" && next.status === "cancelled" && current.status !== "cancelled") {
      const first = waitlist.find((entry) => entry.status === "waiting" && entry.source !== "website" && (entry.branchId ?? workspace.settings.branches[0].id) === current.branchId);
      if (first) waitlist = waitlist.map((entry) => entry.id === first.id ? { ...entry, status: "offered" } : entry);
    }
    return { ...workspace, bookings: workspace.bookings.map((item) => item.id === bookingId ? next : item), waitlist };
  }
  if (action.type === "schedule.block.add") {
    const raw = object(action.block, "Time off");
    const scope = raw.scope;
    if (scope !== "salon" && scope !== "branch" && scope !== "staff") throw new WorkspaceError("Time off scope sahi chunein.");
    const branchId = scope === "branch" || (scope === "staff" && raw.branchId) ? id(raw.branchId, "Branch ID") : undefined;
    const stylistId = scope === "staff" ? id(raw.stylistId, "Staff ID") : undefined;
    if (branchId && !workspace.settings.branches.some((branch) => branch.id === branchId)) throw new WorkspaceError("Sahi branch chunein.");
    if (stylistId && !workspace.settings.stylists.some((staff) => staff.id === stylistId)) throw new WorkspaceError("Sahi staff chunein.");
    const startDate = text(raw.startDate, "Start date", 10, true);
    const endDate = text(raw.endDate, "End date", 10, true);
    if (!isCalendarDate(startDate) || !isCalendarDate(endDate) || endDate < startDate) throw new WorkspaceError("Time off ki date range sahi chunein.");
    const span = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000;
    if (span > 365) throw new WorkspaceError("Time off ki range ek saal tak rakhein.");
    if (typeof raw.allDay !== "boolean") throw new WorkspaceError("All-day setting sahi chunein.");
    const allDay = raw.allDay;
    const startTime = allDay ? undefined : text(raw.startTime, "Start time", 8, true);
    const endTime = allDay ? undefined : text(raw.endTime, "End time", 8, true);
    if (!allDay) {
      const start = parseClockTime(startTime!);
      const end = parseClockTime(endTime!);
      if (start === null || end === null || (end <= start && !(end === 0 && start > 0))) throw new WorkspaceError("End time, start time ke baad hona chahiye (12:00 AM tak).");
    }
    const reason = raw.reason;
    if (reason !== "Holiday" && reason !== "Staff leave" && reason !== "Maintenance" && reason !== "Other") throw new WorkspaceError("Time off ki wajah chunein.");
    const note = optionalText(raw.note, "Note", 160);
    const block: ScheduleBlock = { id: id(raw.id, "Time off ID"), scope, ...(branchId ? { branchId } : {}), ...(stylistId ? { stylistId } : {}), startDate, endDate, allDay, ...(startTime ? { startTime } : {}), ...(endTime ? { endTime } : {}), reason, ...(note ? { note } : {}), createdAt: new Date().toISOString() };
    if ((workspace.scheduleBlocks ?? []).some((item) => item.id === block.id)) throw new WorkspaceError("Time off ID already exists.", 409);
    const conflict = workspace.bookings.find((booking) => blockConflictsWithBooking(block, booking, workspace.settings));
    if (conflict) throw new WorkspaceError(`Is period mein booking ${bookingReference(conflict)} (${conflict.customerName}, ${conflict.time}) hai. Pehle use reschedule ya cancel karein.`, 409);
    return { ...workspace, scheduleBlocks: [block, ...(workspace.scheduleBlocks ?? [])] };
  }
  if (action.type === "schedule.block.delete") {
    const blockId = actionId();
    if (!(workspace.scheduleBlocks ?? []).some((block) => block.id === blockId)) throw new WorkspaceError("Time off nahi mila. Refresh karein.", 404);
    return { ...workspace, scheduleBlocks: (workspace.scheduleBlocks ?? []).filter((block) => block.id !== blockId) };
  }
  if (action.type === "waitlist.decline") {
    const entryId = actionId();
    if (!workspace.waitlist.some((entry) => entry.id === entryId && entry.source === "website" && (entry.status === "waiting" || entry.status === "offered"))) throw new WorkspaceError("Pending website request nahi mili.", 404);
    return { ...workspace, waitlist: workspace.waitlist.map((entry) => entry.id === entryId ? { ...entry, status: "declined" } : entry) };
  }
  if (action.type === "waitlist.offer") {
    const entryId = actionId();
    if (!workspace.waitlist.some((entry) => entry.id === entryId && entry.status === "waiting")) throw new WorkspaceError("Waitlist entry nahi mili.", 404);
    return { ...workspace, waitlist: workspace.waitlist.map((entry) => entry.id === entryId ? { ...entry, status: "offered" } : entry) };
  }
  if (action.type === "waitlist.add") {
    const raw = object(action.entry, "Waitlist entry");
    const branchId = id(raw.branchId, "Branch ID");
    if (!workspace.settings.branches.some((branch) => branch.id === branchId)) throw new WorkspaceError("Sahi branch chunein.");
    const entry: WaitlistEntry = { id: id(raw.id, "Waitlist ID"), salonId: workspace.id, branchId, customerName: text(raw.customerName, "Customer name", 160, true), customerPhone: optionalText(raw.customerPhone, "Customer phone", 50), serviceName: text(raw.serviceName, "Service", 160, true), preferredDate: text(raw.preferredDate, "Date", 80, true), preferredTime: text(raw.preferredTime, "Time", 50, true), status: "waiting", createdAt: text(raw.createdAt, "Created date", 80, true) };
    if (workspace.waitlist.some((item) => item.id === entry.id)) throw new WorkspaceError("Waitlist ID already exists.", 409);
    return { ...workspace, waitlist: [entry, ...workspace.waitlist] };
  }
  throw new WorkspaceError("Unknown workspace action.");
}


/** Validate and append a public website request under the same workspace lock.
 * It is a preference, not a reserved or confirmed appointment. */
export function appendPublicBookingRequest(workspace: SalonWorkspace, input: unknown, requestId: string, createdAt: string): SalonWorkspace {
  if (workspace.publicBookingEnabled !== true) throw new WorkspaceError("Booking link available nahi hai.", 404);
  if (workspace.waitlist.filter((entry) => entry.source === "website" && (entry.status === "waiting" || entry.status === "offered")).length >= 500) throw new WorkspaceError("Request queue abhi full hai. Salon se rabta karein.", 429);
  const raw = object(input, "Booking request");
  const branchId = id(raw.branchId, "Branch ID");
  const serviceId = id(raw.serviceId, "Service ID");
  if (!workspace.settings.branches.some((branch) => branch.id === branchId)) throw new WorkspaceError("Sahi branch chunein.");
  const service = workspace.settings.services.find((item) => item.id === serviceId);
  if (!service) throw new WorkspaceError("Sahi service chunein.");
  const customerName = text(raw.customerName, "Name", 120, true);
  const customerPhone = text(raw.customerPhone, "Phone", 30, true);
  if (!/^[+\d\s()\-]+$/.test(customerPhone) || customerPhone.replace(/\D/g, "").length < 7 || customerPhone.replace(/\D/g, "").length > 15) throw new WorkspaceError("Sahi phone number likhein.");
  const preferredDate = text(raw.preferredDate, "Date", 10, true);
  const preferredTime = text(raw.preferredTime, "Time", 20, true);
  if (!isCalendarDate(preferredDate) || preferredDate < karachiToday() || Date.parse(`${preferredDate}T00:00:00Z`) > Date.parse(`${karachiToday()}T00:00:00Z`) + 366 * 86_400_000) throw new WorkspaceError("Aaj se aglay ek saal ke andar ki date chunein.");
  if (parseClockTime(preferredTime) === null) throw new WorkspaceError("Sahi time chunein.");
  if (raw.consent !== true) throw new WorkspaceError("Contact karne ki permission dein.");
  const entry: WaitlistEntry = { id: id(requestId, "Request ID"), salonId: workspace.id, branchId, customerName, customerPhone, serviceId, serviceName: service.name, source: "website", preferredDate, preferredTime, status: "waiting", createdAt };
  return { ...workspace, waitlist: [entry, ...workspace.waitlist] };
}


/** Validate a public order against current published product and snapshot its price.
 * A client-generated random key makes a network retry idempotent under the same lock. */
export function appendPublicProductOrder(workspace: SalonWorkspace, input: unknown, orderId: string, createdAt: string): { workspace: SalonWorkspace; reference: string } {
  const raw = object(input, "Order request");
  const productId = id(raw.productId, "Product ID");
  const productVersion = number(raw.productVersion, "Product version", 1_000_000_000, 1);
  if (!Number.isInteger(productVersion)) throw new WorkspaceError("Product version sahi nahi hai.");
  const requestKey = text(raw.requestKey, "Request key", 36, true).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestKey)) throw new WorkspaceError("Order request key sahi nahi hai.");
  const quantity = number(raw.quantity, "Quantity", 20, 1);
  if (!Number.isInteger(quantity)) throw new WorkspaceError("Quantity poori tadaad mein likhein.");
  const customerName = text(raw.customerName, "Name", 120, true);
  const customerPhone = text(raw.customerPhone, "Phone", 30, true);
  if (!/^[+\d\s().-]+$/.test(customerPhone) || customerPhone.replace(/\D/g, "").length < 7 || customerPhone.replace(/\D/g, "").length > 15) throw new WorkspaceError("Sahi phone number likhein.");
  const deliveryAddress = text(raw.deliveryAddress, "Delivery address", 350, true);
  if (deliveryAddress.length < 5) throw new WorkspaceError("Mukammal delivery address likhein.");
  const notes = optionalText(raw.notes, "Notes", 500);
  if (raw.consent !== true) throw new WorkspaceError("Contact karne ki permission dein.");
  const orders = workspace.productOrders ?? [];
  const previous = orders.find((order) => order.requestKey === requestKey);
  if (previous) {
    const matches = previous.productId === productId && previous.productVersion === productVersion && previous.quantity === quantity && previous.customerName === customerName && previous.customerPhone === customerPhone && previous.deliveryAddress === deliveryAddress && previous.notes === notes;
    if (!matches) throw new WorkspaceError("Ye request key pehle use ho chuki hai. Naya order banayein.", 409);
    return { workspace, reference: previous.reference };
  }
  const product = (workspace.products ?? []).find((item) => item.id === productId && item.published);
  if (!product) throw new WorkspaceError("Product ab available nahi hai. Shop refresh karein.", 404);
  if (product.version !== productVersion) throw new WorkspaceError("Product details badal gayi hain. Shop refresh karein.", 409);
  if (orders.length >= 1_000 || orders.filter((order) => order.status === "pending").length >= 500) throw new WorkspaceError("Orders filhaal available nahi. Salon se rabta karein.", 503);
  let sequence = Number.isSafeInteger(workspace.productOrderSequence) && (workspace.productOrderSequence ?? 0) >= 0 ? workspace.productOrderSequence! : 0;
  for (const order of orders) {
    const value = Number(order.reference?.match(/^ORD-(\d+)$/)?.[1] ?? 0);
    if (Number.isSafeInteger(value)) sequence = Math.max(sequence, value);
  }
  if (!Number.isSafeInteger(sequence + 1)) throw new WorkspaceError("Order reference limit reached.", 409);
  const nextSequence = sequence + 1;
  const reference = `ORD-${String(nextSequence).padStart(4, "0")}`;
  const order: ProductOrder = { id: id(orderId, "Order ID"), reference, requestKey, productId, productVersion, productName: product.name, unitPricePKR: product.pricePKR, quantity, totalPKR: product.pricePKR * quantity, customerName, customerPhone, deliveryAddress, notes, consent: true, status: "pending", createdAt };
  return { workspace: { ...workspace, productOrderSequence: nextSequence, productOrders: [order, ...orders] }, reference };
}

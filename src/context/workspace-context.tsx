"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { SalonContext, useSalon, type SalonContextType } from "@/context/salon-context";
import { useAuth } from "@/context/auth-context";
import type { Booking, SalonSettings, ScheduleBlock, WaitlistEntry } from "@/types/salon";
import type { ProductDraft, ProductOrderStatus } from "@/types/shop";
import type { CustomerDraft, CustomerTarget } from "@/lib/customers";
import { applyAction, applyProfile, createWorkspace, normalizeProfile, sampleWorkspace, WorkspaceError, type SalonWorkspace, type WorkspaceAction, type WorkspaceProfile } from "@/lib/workspaces/model";
import { bookingDuration, bookingReference, findBookingConflict, findScheduleClosure } from "@/lib/booking-schedule";

type WorkspaceContextValue = {
  workspaces: SalonWorkspace[];
  activeWorkspace: SalonWorkspace;
  activeBranchId: string;
  selectWorkspace: (id: string) => void;
  selectBranch: (id: string) => void;
  refreshWorkspaces: (silent?: boolean) => Promise<void>;
  saveProfile: (profile: WorkspaceProfile) => Promise<SalonWorkspace>;
  removeWorkspace: (id: string) => Promise<void>;
  demo: boolean;
  addScheduleBlock: (block: ScheduleBlock) => Promise<{ ok: boolean; message?: string }>;
  removeScheduleBlock: (id: string) => Promise<{ ok: boolean; message?: string }>;
  saveCustomer: (customer: CustomerDraft, previous?: CustomerTarget) => Promise<{ ok: boolean; message?: string }>;
  deleteCustomer: (target: CustomerTarget) => Promise<{ ok: boolean; message?: string }>;
  setPublicBookingEnabled: (enabled: boolean) => Promise<{ ok: boolean; message?: string }>;
  confirmWebsiteRequest: (id: string, booking: Booking) => Promise<{ ok: boolean; message?: string }>;
  declineWebsiteRequest: (id: string) => Promise<{ ok: boolean; message?: string }>;
  saveProduct: (product: ProductDraft) => Promise<{ ok: boolean; message?: string }>;
  deleteProduct: (id: string, version: number) => Promise<{ ok: boolean; message?: string }>;
  setProductOrderStatus: (id: string, status: ProductOrderStatus) => Promise<{ ok: boolean; message?: string }>;
  deleteProductOrder: (id: string) => Promise<{ ok: boolean; message?: string }>;
};
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspaces() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspaces must be used within ManagedSalonProvider");
  return value;
}

const profileOf = (workspace: SalonWorkspace): WorkspaceProfile => ({
  id: workspace.id, profileVersion: workspace.profileVersion ?? 1, settings: workspace.settings, ownerName: workspace.ownerName,
  email: workspace.email, whatsapp: workspace.whatsapp, images: workspace.images,
});

/**
 * A separate provider keeps the public demo isolated from signed-in data.
 * Server-backed mutations are serialized per browser and the server merges them
 * under a per-salon row lock. No successful save is reported before an ACK.
 */
export function ManagedSalonProvider({ children, initialWorkspaces, demo = false }: {
  children: ReactNode;
  initialWorkspaces?: SalonWorkspace[];
  demo?: boolean;
}) {
  const parent = useSalon();
  const auth = useAuth();
  const [workspaces, setWorkspaces] = useState<SalonWorkspace[]>(() => initialWorkspaces ?? [sampleWorkspace()]);
  const workspacesRef = useRef(workspaces);
  const restricted = !demo && auth.user.role !== "owner";
  const [activeId, setActiveId] = useState(() => (initialWorkspaces ?? [sampleWorkspace()])[0]?.id ?? "");
  const [activeBranchId, setActiveBranchId] = useState(() => restricted ? (initialWorkspaces?.[0]?.settings.branches[0]?.id ?? "") : "all");
  const queue = useRef<Promise<void>>(Promise.resolve());
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeId) ?? workspaces[0];
  const selectionKey = `wordbitx-workspace-selection-${demo ? "demo" : auth.user.id}`;

  // Only IDs are remembered in this browser. Restore them only if the server
  // has already authorized the salon; no workspace data is put in localStorage.
  useEffect(() => {
    // A branch-restricted session never restores an owner-style selection.
    if (restricted) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(selectionKey) ?? "null") as { salon?: string; branch?: string } | null;
      const permitted = workspacesRef.current.find((item) => item.id === saved?.salon);
      if (permitted) {
        setActiveId(permitted.id);
        if (saved?.branch === "all" || permitted.settings.branches.some((branch) => branch.id === saved?.branch)) setActiveBranchId(saved?.branch ?? "all");
      }
    } catch { /* localStorage is optional */ }
  }, [selectionKey, restricted]);
  const remember = (salon: string, branch: string) => {
    try { window.localStorage.setItem(selectionKey, JSON.stringify({ salon, branch })); } catch { /* optional */ }
  };

  const replaceAll = (next: SalonWorkspace[]) => {
    workspacesRef.current = next;
    setWorkspaces(next);
  };
  const replaceOne = (workspace: SalonWorkspace) => {
    if (restricted) { setActiveId(workspace.id); setActiveBranchId(workspace.settings.branches[0]?.id ?? ""); }
    const exists = workspacesRef.current.some((item) => item.id === workspace.id);
    replaceAll(exists ? workspacesRef.current.map((item) => item.id === workspace.id ? workspace : item) : [...workspacesRef.current, workspace]);
  };
  const enqueue = <T,>(work: () => Promise<T>): Promise<T> => {
    const result = queue.current.then(work, work);
    queue.current = result.then(() => undefined, () => undefined);
    return result;
  };
  const request = async (url: string, method: string, body?: unknown): Promise<{ workspace?: SalonWorkspace; workspaces?: SalonWorkspace[]; error?: string }> => {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const data = await response.json() as { workspace?: SalonWorkspace; workspaces?: SalonWorkspace[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Save nahi hua. Dobara try karein.");
    return data;
  };

  const selectWorkspace = (id: string) => {
    if (restricted) return;
    if (!workspacesRef.current.some((workspace) => workspace.id === id)) return;
    setActiveId(id);
    setActiveBranchId("all");
    remember(id, "all");
  };
  const selectBranch = (id: string) => {
    if (restricted) return;
    if (id === "all" || activeWorkspace?.settings.branches.some((branch) => branch.id === id)) {
      setActiveBranchId(id);
      remember(activeWorkspace.id, id);
    }
  };
  const refreshWorkspaces = async (silent = false) => {
    if (demo) { if (!silent) parent.showToast("Public demo isi browser session mein hai."); return; }
    try {
      await enqueue(async () => {
        const data = await request("/api/workspaces", "GET");
        if (!data.workspaces) throw new Error("Salons load nahi hue.");
        replaceAll(data.workspaces);
        const current = data.workspaces.find((item) => item.id === activeId);
        if (restricted) {
          const assigned = data.workspaces[0];
          setActiveId(assigned?.id ?? "");
          setActiveBranchId(assigned?.settings.branches[0]?.id ?? "");
        } else if (!current) {
          const first = data.workspaces[0];
          setActiveId(first?.id ?? ""); setActiveBranchId("all"); remember(first?.id ?? "", "all");
        } else if (activeBranchId !== "all" && !current.settings.branches.some((branch) => branch.id === activeBranchId)) {
          setActiveBranchId("all"); remember(current.id, "all");
        }
      });
      if (!silent) parent.showToast("Salon data refresh ho gaya.");
    } catch (error) { if (!silent) parent.showToast(error instanceof Error ? error.message : "Refresh nahi hua."); }
  };
  const saveProfile = (input: WorkspaceProfile) => enqueue(async () => {
    const profile = normalizeProfile(input);
    const previous = workspacesRef.current.find((item) => item.id === profile.id);
    let saved: SalonWorkspace;
    if (demo) {
      saved = previous ? applyProfile(previous, profile) : createWorkspace(profile);
    } else {
      const data = await request(previous ? `/api/workspaces/${encodeURIComponent(profile.id)}` : "/api/workspaces", previous ? "PUT" : "POST", { profile });
      if (!data.workspace) throw new Error("Salon save nahi hua.");
      saved = data.workspace;
    }
    replaceOne(saved);
    setActiveId(saved.id);
    setActiveBranchId("all");
    remember(saved.id, "all");
    parent.showToast(`${saved.settings.name} ka profile save ho gaya${demo ? " (demo session)" : ""}.`);
    return saved;
  });
  const removeWorkspace = (id: string) => enqueue(async () => {
    if (!workspacesRef.current.some((workspace) => workspace.id === id)) throw new Error("Salon nahi mila.");
    if (demo) {
      if (workspacesRef.current.length <= 1) throw new Error("Kam az kam ek salon zaroori hai. Pehle doosra salon add karein.");
    } else {
      await request(`/api/workspaces/${encodeURIComponent(id)}`, "DELETE");
    }
    const remaining = workspacesRef.current.filter((workspace) => workspace.id !== id);
    replaceAll(remaining);
    if (activeId === id) { setActiveId(remaining[0]?.id ?? ""); setActiveBranchId("all"); remember(remaining[0]?.id ?? "", "all"); }
    parent.showToast("Salon aur us ke records delete ho gaye.");
  });

  const perform = async (workspaceId: string, action: WorkspaceAction, success: string): Promise<{ ok: boolean; message?: string }> => {
    try {
      await enqueue(async () => {
        let saved: SalonWorkspace;
        if (demo) {
          const latest = workspacesRef.current.find((item) => item.id === workspaceId);
          if (!latest) throw new Error("Salon nahi mila.");
          saved = applyAction(latest, action);
        } else {
          const data = await request(`/api/workspaces/${encodeURIComponent(workspaceId)}/actions`, "POST", { action });
          if (!data.workspace) throw new Error("Action save nahi hua.");
          saved = data.workspace;
        }
        replaceOne(saved);
      });
      parent.showToast(success);
      return { ok: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action save nahi hua.";
      parent.showToast(message);
      return { ok: false, message };
    }
  };

  if (!activeWorkspace) {
    return <section className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-xl font-bold">Salon / branch assign nahi hai</h1><p className="mt-3 text-sm text-slate-500">Owner se kahein ke Team access mein aap ke login ko ek salon aur specific branch assign karein. Agar salon ya branch delete hui hai, dobara assignment chahiye.</p><div className="mt-5 flex justify-center gap-2"><button onClick={() => window.location.reload()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Refresh</button><button onClick={() => void auth.signOut()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Sign out</button></div></section>;
  }

  const raw = activeWorkspace.settings;
  const selectedBranch = raw.branches.find((branch) => branch.id === activeBranchId);
  const settings: SalonSettings = {
    ...raw,
    name: raw.name.trim() || "Your salon",
    area: raw.area.trim() || raw.city,
    activeBranchId: selectedBranch?.id ?? raw.branches[0]?.id ?? "",
    stylists: selectedBranch ? raw.stylists.filter((stylist) => !stylist.branchId || stylist.branchId === selectedBranch.id) : raw.stylists,
  };
  const branchOf = (entry: { branchId?: string; branchName?: string }) => entry.branchId ?? raw.branches.find((branch) => branch.name === entry.branchName)?.id ?? raw.branches[0]?.id;
  const matchesBranch = (entry: { branchId?: string; branchName?: string }) => !selectedBranch || branchOf(entry) === selectedBranch.id;
  const bookings = activeWorkspace.bookings.filter(matchesBranch);
  const waitlist = activeWorkspace.waitlist.filter(matchesBranch);
  const repeatCustomers = activeWorkspace.repeatCustomers.filter(matchesBranch);
  const findSlotConflict: SalonContextType["findSlotConflict"] = (stylistName, date, time, excludeId, options) => findBookingConflict([...activeWorkspace.bookings, ...(activeWorkspace.externalBusy ?? [])], raw.services, stylistName, date, time, excludeId, options);
  const checkSlotAvailability: SalonContextType["checkSlotAvailability"] = (stylistName, date, time, options) => {
    const conflict = findSlotConflict(stylistName, date, time, undefined, options);
    if (conflict) return { available: false, conflict, message: conflict.customerName === "Unavailable" ? "Ye staff is waqt available nahi hai. Koi aur slot chunein." : `Ye slot already booked hai — ${conflict.customerName} (${conflict.time}). Koi aur slot chunein.` };
    const stylist = raw.stylists.find((item) => options?.stylistId ? item.id === options.stylistId : item.name === stylistName);
    const branchId = options?.branchId ?? selectedBranch?.id ?? stylist?.branchId ?? raw.branches[0]?.id;
    const closure = findScheduleClosure(raw, activeWorkspace.scheduleBlocks ?? [], { branchId, stylistId: options?.stylistId, stylistName }, date, time, options?.durationMinutes ?? 60);
    return closure ? { available: false, closure, message: `Ye time closed hai — ${closure.label}. Doosra time chunein.` } : { available: true };
  };
  const bookingWithBranch = (booking: Booking): Booking => {
    const staffBranch = raw.stylists.find((stylist) => stylist.id === booking.stylistId)?.branchId;
    const branchId = booking.branchId || selectedBranch?.id || staffBranch || raw.branches[0]?.id;
    return { ...booking, salonId: activeWorkspace.id, branchId, branchName: raw.branches.find((branch) => branch.id === branchId)?.name };
  };
  const addBooking = async (input: Booking) => {
    const booking = bookingWithBranch(input);
    const duration = bookingDuration(booking, raw.services);
    const availability = checkSlotAvailability(booking.stylistName, booking.date, booking.time, { stylistId: booking.stylistId, branchId: booking.branchId, durationMinutes: duration });
    if (!availability.available) {
      const message = availability.message ?? "Ye time available nahi hai.";
      parent.showToast(message);
      return { ok: false, message };
    }
    const result = await perform(activeWorkspace.id, { type: "booking.add", booking }, `${booking.customerName} ki booking add ho gayi. WhatsApp send nahi hua.`);
    // Another session may have reserved this slot after the screen loaded.
    // Keep the form open and refresh the schedule without replacing the error.
    if (!result.ok) await refreshWorkspaces(true);
    return result;
  };
  const updateBooking: SalonContextType["updateBooking"] = async (id, patch) => {
    try {
      applyAction(activeWorkspace, { type: "booking.edit", id, patch });
      const result = await perform(activeWorkspace.id, { type: "booking.edit", id, patch }, `Booking ${bookingReference(activeWorkspace.bookings.find((item) => item.id === id)!)} update ho gayi.`);
      if (!result.ok) await refreshWorkspaces(true);
      return result;
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Save nahi hua." };
    }
  };
  const cancelBooking = (id: string) => perform(activeWorkspace.id, { type: "booking.status", id, status: "cancelled" }, "Booking cancel ho gayi. Waitlist offer sirf simulation hai; koi message send nahi hua.");
  const completeBooking = (id: string) => perform(activeWorkspace.id, { type: "booking.status", id, status: "completed" }, "Booking complete mark hui. Koi message send nahi hua.");
  const deleteBooking = (id: string) => perform(activeWorkspace.id, { type: "booking.delete", id }, "Booking delete ho gayi.");
  const addWaitlistEntry = (entry: WaitlistEntry) => perform(activeWorkspace.id, { type: "waitlist.add", entry: { ...entry, salonId: activeWorkspace.id, branchId: entry.branchId || selectedBranch?.id || raw.branches[0]?.id } }, "Waitlist entry add ho gayi.");
  const offerWaitlistEntry = (id: string) => perform(activeWorkspace.id, { type: "waitlist.offer", id }, "Slot offer simulated — koi WhatsApp message send nahi hua.");
  const confirmWaitlistBooking = (id: string) => {
    const entry = activeWorkspace.waitlist.find((item) => item.id === id);
    if (!entry || entry.status !== "offered") return;
    const service = raw.services.find((item) => item.name === entry.serviceName);
    const branchId = entry.branchId ?? raw.branches[0]?.id;
    const stylist = raw.stylists.find((item) => !item.branchId || item.branchId === branchId);
    const booking: Booking = { id: `BK-${crypto.randomUUID()}`, salonId: activeWorkspace.id, branchId, customerName: entry.customerName, customerPhone: entry.customerPhone, serviceId: service?.id, serviceName: entry.serviceName, stylistId: stylist?.id, stylistName: stylist?.name ?? "Unassigned", date: entry.preferredDate, time: entry.preferredTime, status: "confirmed", amountPKR: service?.pricePKR ?? 0, channel: "waitlist", createdAt: new Date().toISOString(), isRecovered: true };
    perform(activeWorkspace.id, { type: "waitlist.confirm", id, booking }, "Waitlist acceptance simulate hui. Booking add ho gayi; koi message send nahi hua.");
  };
  const exportCsv = () => {
    const rows = [["booking_id", "salon", "branch", "customer", "phone_masked", "service", "amount_pkr", "date", "time", "stylist", "channel", "status"], ...bookings.map((booking) => [bookingReference(booking), settings.name, booking.branchName ?? "", booking.customerName, `••••${booking.customerPhone.replace(/\D/g, "").slice(-4)}`, booking.serviceName, String(booking.amountPKR), booking.date, booking.time, booking.stylistName, booking.channel, booking.status])];
    const csv = rows.map((row) => row.map((value) => `"${(/^[=+@\-\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = `salon-bookings-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
    parent.showToast("Selected salon / branch ka CSV download ho gaya.");
  };
  const recovered = bookings.filter((booking) => booking.isRecovered && booking.status !== "cancelled");
  const value: SalonContextType = {
    ...parent, settings, bookings, waitlist, repeatCustomers,
    recoveredCount: recovered.length, recoveredRevenuePKR: recovered.reduce((sum, booking) => sum + booking.amountPKR, 0),
    addBooking, cancelBooking, completeBooking, deleteBooking, updateBooking, findSlotConflict, checkSlotAvailability,
    addWaitlistEntry, offerWaitlistEntry, confirmWaitlistBooking, exportCsv,
    updateSettings: (patch) => { void saveProfile({ ...profileOf(activeWorkspace), settings: { ...raw, ...patch } }).catch((error) => parent.showToast(error instanceof Error ? error.message : "Save nahi hua.")); },
    resetSettings: () => parent.showToast("Salon registry se profile edit karein."),
  };
  const addScheduleBlock = async (block: ScheduleBlock) => {
    const result = await perform(activeWorkspace.id, { type: "schedule.block.add", block }, "Time off save ho gaya; schedule update ho gaya.");
    if (!result.ok) await refreshWorkspaces(true);
    return result;
  };
  const removeScheduleBlock = async (id: string) => {
    const result = await perform(activeWorkspace.id, { type: "schedule.block.delete", id }, "Time off remove ho gaya. Baqi off days ya closures ab bhi apply ho sakti hain.");
    if (!result.ok) await refreshWorkspaces(true);
    return result;
  };
  const saveCustomer = (customer: CustomerDraft, previous?: CustomerTarget) => perform(activeWorkspace.id, { type: "customer.save", customer, previous }, "Customer record save ho gaya.");
  const deleteCustomer = (target: CustomerTarget) => perform(activeWorkspace.id, { type: "customer.delete", target }, "Customer directory se remove ho gaya; booking history safe hai.");
  const setPublicBookingEnabled = (enabled: boolean) => perform(activeWorkspace.id, { type: "public-booking.set", enabled }, enabled ? "Website request link on ho gaya." : "Website request link band ho gaya.");
  const confirmWebsiteRequest = async (id: string, booking: Booking) => {
    const result = await perform(activeWorkspace.id, { type: "waitlist.confirm", id, booking: bookingWithBranch(booking) }, "Request confirm ho gayi aur Bookings mein aa gayi. Customer ko manually batayein; koi message send nahi hua.");
    if (!result.ok) await refreshWorkspaces(true);
    return result;
  };
  const declineWebsiteRequest = (id: string) => perform(activeWorkspace.id, { type: "waitlist.decline", id }, "Request decline ho gayi. Customer ko koi message send nahi hua.");
  const shopAction = async (action: WorkspaceAction, message: string) => {
    const result = await perform(activeWorkspace.id, action, message);
    if (!result.ok) await refreshWorkspaces(true);
    return result;
  };
  const saveProduct = (product: ProductDraft) => shopAction({ type: "shop.product.save", product }, product.published ? "Product save aur website par publish ho gaya." : "Product draft save ho gaya.");
  const deleteProduct = (id: string, version: number) => shopAction({ type: "shop.product.delete", id, version }, "Product remove ho gaya. Purane orders safe hain.");
  const setProductOrderStatus = (id: string, status: ProductOrderStatus) => shopAction({ type: "shop.order.status", id, status }, "Order status update ho gaya. Customer ko manually batayein.");
  const deleteProductOrder = (id: string) => shopAction({ type: "shop.order.delete", id }, "Order record remove ho gaya.");
  return <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, activeBranchId, selectWorkspace, selectBranch, refreshWorkspaces, saveProfile, removeWorkspace, demo, addScheduleBlock, removeScheduleBlock, saveCustomer, deleteCustomer, setPublicBookingEnabled, confirmWebsiteRequest, declineWebsiteRequest, saveProduct, deleteProduct, setProductOrderStatus, deleteProductOrder }}><SalonContext.Provider value={value}>{children}</SalonContext.Provider></WorkspaceContext.Provider>;
}

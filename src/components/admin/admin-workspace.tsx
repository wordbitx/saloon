"use client";

/* Uploaded data URLs are intentionally rendered locally, not sent to an image optimizer. */
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowRight, Bell, Brush, CalendarDays, Check, CheckCircle2,
  ChevronDown, Clock3, Download, Droplets, FileBarChart2, FileSpreadsheet, Filter, Headset, Inbox,
  LayoutDashboard, LogOut, MapPin, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, Plus, Scissors, Search, Settings2, ShoppingBag, Store,
  ShieldCheck, Sparkles, Users, UserCog, UserPlus, X, type LucideIcon,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { useAuth } from "@/context/auth-context";
import { Booking, ServiceCategory, type WaitlistEntry } from "@/types/salon";
import type { Capability } from "@/lib/auth/roles";
import { ROLE_LABEL } from "@/lib/auth/roles";
import AccountMenu from "@/components/admin/account-menu";
import TeamAccess from "@/components/admin/team-access";
import SalonChairTimeline from "@/components/admin/salon-chair-timeline";
import StylistWorkload from "@/components/admin/stylist-workload";
import SalonServiceMix from "@/components/admin/salon-service-mix";
import SalonCustomers from "@/components/admin/salon-customers";
import SalonShop from "@/components/admin/salon-shop";
import WebsiteBookingControls from "@/components/admin/website-booking-controls";
import OverviewPanel from "@/components/admin/overview-panel";
import BookingTable from "@/components/admin/booking-table";
import DrillDrawer from "@/components/admin/drill-drawer";
import type { DrillSpec } from "@/lib/salon-analytics";
import SalonRegistry from "@/components/admin/salon-registry";
import { ManagedSalonProvider, useWorkspaces } from "@/context/workspace-context";
import type { SalonWorkspace } from "@/lib/workspaces/model";
import { bookingReference, karachiToday, parseClockTime, scheduleSlots, type BookingSlotSelection } from "@/lib/booking-schedule";

const categoryIcon: Record<ServiceCategory, typeof Scissors> = {
  Hair: Scissors,
  "Skin & Facial": Sparkles,
  "Makeup & Bridal": Brush,
  Nails: Droplets,
};

type Section = "overview" | "bookings" | "inbox" | "customers" | "waitlist" | "services" | "staff" | "salon-registry" | "reports" | "settings" | "audit" | "team" | "shop";

const sectionInfo: { id: Section; label: string; sub: string; icon: LucideIcon; capability: Capability }[] = [
  { id: "overview", label: "Overview", sub: "Aaj ka salon snapshot", icon: LayoutDashboard, capability: "bookings.view" },
  { id: "bookings", label: "Bookings", sub: "Tamam appointments", icon: CalendarDays, capability: "bookings.view" },
  { id: "inbox", label: "Recovery inbox", sub: "Missed calls & messages", icon: Inbox, capability: "inbox.manage" },
  { id: "customers", label: "Customers", sub: "Loyal clients", icon: Users, capability: "customers.view" },
  { id: "waitlist", label: "Waitlist", sub: "Khaali slot queue", icon: Clock3, capability: "waitlist.manage" },
  { id: "shop", label: "Products & orders", sub: "Website shop", icon: ShoppingBag, capability: "shop.manage" },
  { id: "services", label: "Services & prices", sub: "Salon menu", icon: FileSpreadsheet, capability: "services.view" },
  { id: "staff", label: "Staff & branches", sub: "Team & chairs", icon: Headset, capability: "staff.view" },
  { id: "salon-registry", label: "Salon registry", sub: "New salon + images", icon: Store, capability: "registry.manage" },
  { id: "reports", label: "Reports & export", sub: "CSV & summaries", icon: FileBarChart2, capability: "reports.view" },
  { id: "settings", label: "Settings", sub: "Salon profile", icon: Settings2, capability: "settings.manage" },
  { id: "audit", label: "Activity log", sub: "Recent actions", icon: Activity, capability: "audit.view" },
  { id: "team", label: "Team access", sub: "Logins & permissions", icon: UserCog, capability: "team.manage" },
];

const sampleInbox = [
  { id: "MSG-1204", name: "Demo guest · Ayesha", maskedPhone: "•••• 5891", channel: "Night WhatsApp", time: "11:42 PM", message: "Assalam o alaikum, Balayage ka rate aur kal slot mil jayega?", status: "Needs owner review" },
  { id: "MSG-1203", name: "Demo caller · Sana", maskedPhone: "•••• 1903", channel: "Missed call", time: "10:14 AM", message: "Customer ka call miss hua. WhatsApp follow-up ka sample preview ready hai.", status: "Awaiting follow-up" },
  { id: "MSG-1202", name: "Demo guest · Mahnoor", maskedPhone: "•••• 3847", channel: "Peak overflow", time: "09:36 AM", message: "Hina se appointment chahiye, Friday afternoon possible hai?", status: "Owner review" },
  { id: "MSG-1201", name: "Demo guest · Mariam", maskedPhone: "•••• 8776", channel: "Night WhatsApp", time: "Yesterday", message: "Barat makeup aur bridal trial ki details please.", status: "Sample reply prepared" },
];

const channelName = (booking: Booking) => booking.channel === "whatsapp_night" ? "Night WhatsApp" : booking.channel === "missed_call" ? "Missed call" : booking.channel === "overflow_peak" ? "Peak overflow" : booking.channel === "waitlist" ? "Waitlist" : "Direct";
const currency = (amount: number) => `PKR ${amount.toLocaleString("en-PK")}`;
const masked = (phone: string) => `•••• ${phone.replace(/\D/g, "").slice(-4)}`;

export default function AdminWorkspace({ demoMode = false, initialWorkspaces }: { demoMode?: boolean; initialWorkspaces?: SalonWorkspace[] }) {
  return <ManagedSalonProvider demo={demoMode} initialWorkspaces={initialWorkspaces}><AdminWorkspaceContent demoMode={demoMode} /></ManagedSalonProvider>;
}

/** The salon identity itself is the owner-only salon/branch switcher. */
function WorkspaceIdentity({ compact, demoMode, onExpand, onScopeChange }: { compact: boolean; demoMode: boolean; onExpand: () => void; onScopeChange: () => void }) {
  const { user, demo } = useAuth();
  const { workspaces, activeWorkspace, activeBranchId, selectWorkspace, selectBranch } = useWorkspaces();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const owner = demo || user.role === "owner";
  const branchName = activeWorkspace.settings.branches.find((branch) => branch.id === activeBranchId)?.name;
  const badge = <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#052767] to-[#1CA830] text-sm font-bold text-white"><Scissors size={15} /></span>;
  if (compact) return <div className="mb-5 flex justify-center">{owner ? <button type="button" title="Switch salon and branch" aria-label="Switch salon and branch" onClick={() => { onExpand(); setOpen(true); }}>{badge}</button> : badge}</div>;
  const detail = <><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-800 dark:text-white">{activeWorkspace.settings.name}</strong><span className="mt-0.5 block truncate text-[10px] text-slate-500">{owner ? `${activeWorkspace.settings.area || activeWorkspace.settings.city} · ${activeWorkspace.settings.branches.length} branches` : `Assigned · ${branchName ?? "branch"}`}</span>{owner && activeBranchId !== "all" && <span className="mt-0.5 block truncate text-[9px] font-bold text-emerald-700 dark:text-emerald-400">{branchName}</span>}</span></>;
  return <div className="mb-5 px-2">
    <span className="text-[9px] font-extrabold uppercase tracking-[.15em] text-slate-500 dark:text-slate-400">{demoMode ? "SALON WORKSPACE" : "SALON ADMIN"}</span>
    {owner ? <button type="button" aria-label="Switch salon and branch" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} className="mt-2 flex w-full items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-left transition hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900/60">{badge}{detail}<ChevronDown size={13} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} /></button> : <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/60">{badge}{detail}</div>}
    {owner && <div id={panelId} hidden={!open} className="mt-2 space-y-2 rounded-xl border border-emerald-100 bg-white p-2.5 dark:border-emerald-900 dark:bg-slate-900">
      <label className="block text-[10px] font-bold text-slate-500">Salon<select aria-label="Switch salon" value={activeWorkspace.id} onChange={(event) => { selectWorkspace(event.target.value); onScopeChange(); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.settings.name}{workspace.isSample ? " · sample" : ""}</option>)}</select></label>
      <label className="block text-[10px] font-bold text-slate-500">Branch<select aria-label="Switch branch" value={activeBranchId} onChange={(event) => { selectBranch(event.target.value); onScopeChange(); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="all">All branches</option>{activeWorkspace.settings.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
    </div>}
    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {user.displayName} · {ROLE_LABEL[user.role]}</div>
  </div>;
}

function AdminWorkspaceContent({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const { settings, bookings, waitlist, repeatCustomers, recoveredCount, recoveredRevenuePKR, addBooking, cancelBooking, completeBooking, offerWaitlistEntry, confirmWaitlistBooking, exportCsv, showToast, toastMessage, checkSlotAvailability } = useSalon();
  const { activeWorkspace, activeBranchId, workspaces, confirmWebsiteRequest, declineWebsiteRequest } = useWorkspaces();
  const { user, can, signOut, demo } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [inboxDone, setInboxDone] = useState<string[]>([]);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [bookingFormError, setBookingFormError] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);
  const bookingSavingRef = useRef(false);
  const [drill, setDrill] = useState<DrillSpec | null>(null);
  const openDrill = (spec: DrillSpec) => setDrill(spec);
  const [newCustomer, setNewCustomer] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newBranchId, setNewBranchId] = useState(settings.branches[0]?.id ?? "");
  const [newServiceId, setNewServiceId] = useState(settings.services[0]?.id ?? "");
  const [newDateISO, setNewDateISO] = useState(karachiToday);
  const bookingFormRef = useRef<HTMLFormElement>(null);
  const bookingTriggerRef = useRef<HTMLElement | null>(null);
  const [newTime, setNewTime] = useState("04:30 PM");
  const [newStaffId, setNewStaffId] = useState(settings.stylists[0]?.id ?? "");

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    const menuButton = mobileMenuButtonRef.current;
    document.body.style.overflow = "hidden";
    // The container becomes visible after its transition; avoid stealing focus
    // if the visitor has already tabbed into the drawer in the meantime.
    const focusTimer = window.setTimeout(() => {
      if (!mobileDrawerRef.current?.contains(document.activeElement)) mobileCloseButtonRef.current?.focus();
    }, 220);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavOpen(false);
      }
      if (event.key !== "Tab" || !mobileDrawerRef.current) return;
      const focusable = Array.from(mobileDrawerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!mobileDrawerRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    // Do not leave the page scroll-locked if a phone is rotated or resized to desktop.
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileNavOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!newBookingOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    bookingFormRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !bookingSavingRef.current) { event.preventDefault(); setNewBookingOpen(false); setBookingFormError(""); return; }
      if (event.key !== "Tab" || !bookingFormRef.current) return;
      const focusable = Array.from(bookingFormRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (!bookingFormRef.current.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; bookingTriggerRef.current?.focus(); };
  }, [newBookingOpen]);

  const currentInbox = activeWorkspace.isSample && activeBranchId === "all" ? sampleInbox : [];
  const pendingOrders = workspaces.reduce((sum, workspace) => sum + (workspace.productOrders ?? []).filter((order) => order.status === "pending").length, 0);
  const availableSections = sectionInfo.filter((section) => can(section.capability) && !(demoMode && section.id === "team"));
  const visibleBookings = useMemo(() => bookings.filter((booking) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || booking.customerName.toLowerCase().includes(query) || booking.serviceName.toLowerCase().includes(query) || bookingReference(booking).toLowerCase().includes(query) || booking.id.toLowerCase().includes(query);
    const matchesStatus = bookingStatus === "all" || booking.status === bookingStatus;
    return matchesQuery && matchesStatus;
  }), [bookings, search, bookingStatus]);

  const openBookingForm = (walkIn = false, slot?: BookingSlotSelection) => {
    if (!can("bookings.create")) return;
    const selectedStaff = activeWorkspace.settings.stylists.find((staff) => staff.id === slot?.stylistId);
    const branchId = activeBranchId === "all" ? slot?.branchId ?? selectedStaff?.branchId ?? activeWorkspace.settings.branches[0]?.id : activeBranchId;
    const person = selectedStaff && (!selectedStaff.branchId || selectedStaff.branchId === branchId)
      ? selectedStaff : activeWorkspace.settings.stylists.find((staff) => !staff.branchId || staff.branchId === branchId);
    bookingTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNewBranchId(branchId ?? "");
    setNewStaffId(person?.id ?? "");
    setNewServiceId(activeWorkspace.settings.services[0]?.id ?? "");
    setNewDateISO(slot?.dateISO ?? karachiToday());
    setNewTime(slot?.time ?? scheduleSlots(settings.openingTime, settings.closingTime)[0] ?? "11:00 AM");
    setReviewRequestId(null);
    setNewCustomer(walkIn ? "Walk-in guest" : "");
    setNewCustomerPhone("");
    setBookingFormError("");
    setNewBookingOpen(true);
  };

  const reviewWebsiteRequest = (entry: WaitlistEntry) => {
    if (!can("waitlist.manage") || entry.source !== "website") return;
    const branchId = entry.branchId ?? activeWorkspace.settings.branches[0]?.id ?? "";
    const service = activeWorkspace.settings.services.find((item) => entry.serviceId ? item.id === entry.serviceId : item.name === entry.serviceName);
    const stylist = activeWorkspace.settings.stylists.find((person) => !person.branchId || person.branchId === branchId);
    bookingTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setReviewRequestId(entry.id); setNewCustomer(entry.customerName); setNewCustomerPhone(entry.customerPhone);
    setNewBranchId(branchId); setNewServiceId(service?.id ?? ""); setNewStaffId(stylist?.id ?? "");
    setNewDateISO(entry.preferredDate); setNewTime(entry.preferredTime); setBookingFormError(""); setNewBookingOpen(true);
  };

  const createBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!can("bookings.create")) { setBookingFormError("Aap ke role ke paas booking add karne ki permission nahi hai."); return; }
    const service = activeWorkspace.settings.services.find((item) => item.id === newServiceId);
    const stylist = activeWorkspace.settings.stylists.find((item) => item.id === newStaffId && (!item.branchId || item.branchId === newBranchId));
    if (!service || !stylist || !newBranchId || !newCustomer.trim()) {
      setBookingFormError("Service, staff aur branch select karein. Zaroorat ho to Salon registry mein pehle add karein."); return;
    }
    if (!newDateISO || parseClockTime(newTime) === null) { setBookingFormError("Sahi date aur time likhein, jaise 04:30 PM."); return; }
    const slotState = checkSlotAvailability(stylist.name, newDateISO, newTime, { stylistId: stylist.id, branchId: newBranchId, durationMinutes: service.durationMinutes });
    if (!slotState.available) { setBookingFormError(slotState.message ?? "Ye slot already booked hai."); return; }
    bookingSavingRef.current = true;
    setBookingSaving(true);
    const booking: Booking = {
      id: `BK-${crypto.randomUUID()}`, salonId: settings.id, branchId: newBranchId,
      customerName: newCustomer.trim(), customerPhone: newCustomerPhone.trim(),
      serviceId: service.id, serviceName: service.name, durationMinutes: service.durationMinutes, stylistId: stylist.id, stylistName: stylist.name,
      branchName: settings.branches.find((branch) => branch.id === newBranchId)?.name,
      date: newDateISO, time: newTime, status: "confirmed", amountPKR: service.pricePKR,
      channel: "direct", createdAt: new Date().toISOString(), isRecovered: false,
    };
    const saved = reviewRequestId ? await confirmWebsiteRequest(reviewRequestId, booking) : await addBooking(booking);
    bookingSavingRef.current = false;
    setBookingSaving(false);
    if (!saved.ok) { setBookingFormError(saved.message ?? "Booking save nahi hui. Dobara try karein."); return; }
    setNewBookingOpen(false); setReviewRequestId(null); setNewCustomer(""); setNewCustomerPhone(""); setBookingFormError("");
  };

  const startSection = (section: Section) => {
    setActiveSection(section);
    setMobileNavOpen(false);
  };

  const renderNav = (compact: boolean) => <>
    <WorkspaceIdentity compact={compact} demoMode={demoMode} onExpand={() => setDesktopNavCollapsed(false)} onScopeChange={() => { setSearch(""); setBookingStatus("all"); setInboxDone([]); setDrill(null); }} />
    <nav aria-label="Salon workspace sections" className="space-y-1">
      {availableSections.map(({ id, label, sub, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => startSection(id)}
          aria-label={compact ? label : undefined}
          aria-current={activeSection === id ? "page" : undefined}
          title={compact ? label : undefined}
          className={`flex w-full items-center rounded-xl py-2.5 text-left text-xs font-semibold transition ${compact ? "justify-center px-2" : "gap-3 px-3"} ${activeSection === id ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"}`}
        >
          <Icon size={16} className="shrink-0" />
          {!compact && <span className="min-w-0 flex-1"><span className="block">{label}</span><span className={`block text-[9px] font-medium ${activeSection === id ? "text-emerald-700/80 dark:text-emerald-300/80" : "text-slate-400"}`}>{sub}</span></span>}
          {!compact && id === "inbox" && <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">{currentInbox.filter((item) => !inboxDone.includes(item.id)).length}</span>}
          {!compact && id === "shop" && pendingOrders > 0 && <span aria-label={`${pendingOrders} pending product orders`} className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">{pendingOrders}</span>}
        </button>
      ))}
    </nav>
    <div className="mt-auto space-y-1 border-t border-slate-100 pt-4 dark:border-slate-800">
      {can("settings.manage") && <button type="button" onClick={() => { startSection("settings"); }} aria-label={compact ? "Salon setup" : undefined} title={compact ? "Salon setup" : undefined} className={`flex w-full items-center rounded-xl py-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70 ${compact ? "justify-center px-2" : "gap-3 px-3"}`}><Settings2 size={16} />{!compact && "Salon setup"}</button>}
      <button type="button" onClick={() => { setMobileNavOpen(false); if (demoMode || demo) { router.push("/"); return; } void signOut(); }} aria-label={compact ? (demoMode || demo ? "Back to website" : "Sign out") : undefined} title={compact ? (demoMode || demo ? "Back to website" : "Sign out") : undefined} className={`flex w-full items-center rounded-xl py-2.5 text-left text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-300 ${compact ? "justify-center px-2" : "gap-3 px-3"}`}><LogOut size={16} />{!compact && (demoMode || demo ? "Back to website" : "Sign out")}</button>
    </div>
  </>;

  const walkInBooking = () => openBookingForm(true);

  const overview = (
    <OverviewPanel
      onDrill={openDrill}
      onNavigate={(section) => startSection(section as Section)}
      onAddBooking={() => openBookingForm()}
      onSelectSlot={(slot) => openBookingForm(false, slot)}
      onWalkIn={walkInBooking}
      onExportCsv={exportCsv}
      inbox={currentInbox}
      inboxPending={currentInbox.filter((item) => !inboxDone.includes(item.id)).length}
    />
  );

  const bookingsPage = <div className="space-y-4">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Appointment register · {activeWorkspace.isSample ? "sample records" : "selected salon"}</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Bookings <span className="text-sm font-semibold text-slate-400">(chair schedule)</span></h2><p className="mt-1 text-xs text-slate-500">Filter, review, complete ya cancel karein. Review request sirf preview hai; WhatsApp send nahi hota.</p></div>{can("bookings.create") && <div className="flex gap-2"><button onClick={walkInBooking} className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-200"><UserPlus className="mr-1 inline" size={14}/>Walk-in</button><button onClick={() => openBookingForm()} className="rounded-lg bg-[#1CA830] px-3.5 py-2.5 text-xs font-bold text-white"><Plus className="mr-1 inline" size={14}/>New booking</button></div>}</div>
    <p className="rounded-xl border border-emerald-100 bg-white px-4 py-3 text-[11px] font-semibold text-slate-600 dark:border-emerald-900/40 dark:bg-[#050d21] dark:text-slate-300">{settings.name} · {activeBranchId === "all" ? "All branches" : settings.branches.find((branch) => branch.id === activeBranchId)?.name}</p>
    <SalonChairTimeline showRecords={false} onAddBooking={can("bookings.create") ? walkInBooking : undefined} onSelectSlot={can("bookings.create") ? (slot) => openBookingForm(false, slot) : undefined} onOpenDrill={openDrill} />
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#050d21] sm:flex-row"><label className="relative flex-1"><Search size={14} className="absolute left-3 top-2.5 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find booking, customer, service..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></label><select value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
    <BookingTable rows={visibleBookings} />
  </div>;

  const inboxPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-300">Sample data · no messages sent</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Recovery inbox</h2><p className="mt-1 text-xs text-slate-500">Review simulated missed inquiries and mark them handled. This inbox is not connected to WhatsApp.</p></div><div className="grid gap-3">{currentInbox.map((item) => { const handled = inboxDone.includes(item.id); return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]"><div className="flex flex-col gap-3 sm:flex-row sm:items-start"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><MessageCircle size={17}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-xs text-slate-800 dark:text-white">{item.name}</strong><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.channel}</span><span className="text-[10px] text-slate-400">{item.time}</span></div><p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.message}</p><p className="mt-2 text-[10px] text-slate-400">{item.maskedPhone} · {item.status}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => { setInboxDone((current) => current.includes(item.id) ? current : [...current, item.id]); showToast("Inbox item marked handled. No customer message sent."); }} disabled={handled} className="rounded-lg bg-[#052767] px-3 py-2 text-[10px] font-bold text-white disabled:bg-emerald-700">{handled ? "Handled" : "Mark handled"}</button><button onClick={() => showToast("TODO (owner decision): authenticated owner reply composer and approved Meta templates.")} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Owner reply preview</button></div></div></div></article>; })}</div></div>;

  const customersPage = <SalonCustomers />;
  const shopPage = <SalonShop key={activeWorkspace.id} />;

  const waitlistPage = <div className="space-y-4">
    <div><span className="text-[9px] font-extrabold uppercase tracking-widest text-violet-700 dark:text-violet-300">Requests &amp; queue</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Waitlist manager</h2><p className="mt-1 text-xs text-slate-500">Website request pehle pending rehti hai. Customer se manually rabta karein, slot check karein aur yahin se confirm karein; phir wo Bookings mein nazar aayegi. Koi message automatically send nahi hota.</p></div>
    <WebsiteBookingControls />
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21]">{waitlist.length === 0 && <p className="p-6 text-center text-xs text-slate-400">Is selection mein koi waitlist request nahi.</p>}{waitlist.map((entry) => <div key={entry.id} className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-xs text-slate-800 dark:text-white">{entry.customerName} <span className="font-normal text-slate-400">{entry.source === "website" ? <a className="text-emerald-700 underline dark:text-emerald-400" href={`tel:${entry.customerPhone.replace(/[^+\d]/g, "")}`}>{entry.customerPhone}</a> : masked(entry.customerPhone)}</span></strong><p className="mt-1 text-[11px] text-slate-500">{entry.serviceName} · {entry.preferredDate} · {entry.preferredTime} · {settings.branches.find((branch) => branch.id === entry.branchId)?.name ?? "Branch"}</p>{entry.source === "website" && <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Website request · not auto-confirmed</span>}</div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">{entry.status}</span>{entry.source === "website" && (entry.status === "waiting" || entry.status === "offered") && <><button type="button" onClick={() => reviewWebsiteRequest(entry)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white">Review &amp; confirm</button><button type="button" onClick={() => { if (window.confirm("Request decline karein? Customer ko koi message automatically nahi jayega.")) void declineWebsiteRequest(entry.id); }} className="rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-bold text-rose-700 dark:border-rose-900 dark:text-rose-300">Decline</button></>}{entry.source !== "website" && entry.status === "waiting" && <button onClick={() => offerWaitlistEntry(entry.id)} className="rounded-lg border border-violet-200 px-3 py-2 text-[10px] font-bold text-violet-700 dark:border-violet-900 dark:text-violet-300">Offer slot (simulation)</button>}{entry.source !== "website" && entry.status === "offered" && <button onClick={() => confirmWaitlistBooking(entry.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white">Simulate accept</button>}</div></div>)}</div>
  </div>;

  const servicesPage = <div className="space-y-4"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Active salon menu</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Services & pricing</h2><p className="mt-1 text-xs text-slate-500">Selected salon ka editable service menu.</p></div>{can("settings.manage") && <button onClick={() => startSection("salon-registry")} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Edit menu settings</button>}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{settings.services.map((service) => { const CatIcon = categoryIcon[service.category] ?? Scissors; return <article key={service.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><CatIcon size={10} /> {service.category}</span><h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-white">{service.name}</h3><p className="mt-1 min-h-9 text-[10px] leading-relaxed text-slate-500">{service.description}</p><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800"><strong className="text-sm text-emerald-700 dark:text-emerald-400">{currency(service.pricePKR)}</strong><span className="text-[10px] text-slate-400">{service.durationMinutes} mins</span></div></article>; })}</div></div>;

  const staffPage = <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300">Salon team · chair owners</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Staff & branches</h2><p className="mt-1 text-xs text-slate-500">Selected salon aur branch ke staff profiles.</p></div>{can("registry.manage") && <button onClick={() => startSection("salon-registry")} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Manage staff & branches</button>}</div>
    <div className="grid gap-4 lg:grid-cols-2">{activeWorkspace.settings.branches.filter((branch) => activeBranchId === "all" || branch.id === activeBranchId).map((branch) => {
      const team = activeWorkspace.settings.stylists.filter((person) => !person.branchId || person.branchId === branch.id);
      return <section key={branch.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Branch</span><h3 className="mt-1 text-sm font-bold text-[#052767] dark:text-white">{branch.name}</h3><p className="mt-1 text-[10px] text-slate-500">{branch.area || settings.city}</p><div className="mt-4 space-y-2">{team.map((person) => <div key={person.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">{person.photoDataUrl ? <img src={person.photoDataUrl} alt={`${person.name} photo`} className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-emerald-800 dark:bg-slate-800 dark:text-emerald-300">{person.name.slice(0,1).toUpperCase()}</span>}<span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-slate-800 dark:text-white">{person.name}</strong><span className="block truncate text-[10px] text-slate-500">{person.specialty || "Stylist"}</span></span></div>)}{team.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-900">Is branch mein abhi staff add nahi hua.</p>}</div></section>;
    })}</div>
  </div>;

  const reportsPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300">Owner reporting</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Reports & exports</h2><p className="mt-1 text-xs text-slate-500">Summary selected salon / branch ki bookings se calculate hoti hai.</p></div><div className="grid gap-3 sm:grid-cols-3">{[{label:"Recovered bookings",value:String(recoveredCount)},{label:"Recovered service value",value:currency(recoveredRevenuePKR)},{label:"Waitlist currently waiting",value:String(waitlist.filter((entry)=>entry.status==="waiting").length)}].map((card)=><div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</span><strong className="mt-3 block text-xl font-extrabold text-[#052767] dark:text-white">{card.value}</strong></div>)}</div><section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#050d21] sm:flex-row sm:items-center"><div><h3 className="text-sm font-bold text-[#052767] dark:text-white">Booking recovery export</h3><p className="mt-1 text-xs text-slate-500">CSV selected salon / branch ki bookings aur masked phone numbers rakhta hai.</p></div><button onClick={exportCsv} className="rounded-lg bg-[#052767] px-4 py-2.5 text-xs font-bold text-white"><Download className="mr-1.5 inline" size={14}/>Download CSV</button></section></div>;

  const settingsPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Workspace configuration</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Admin settings</h2><p className="mt-1 text-xs text-slate-500">Signed in as {user.displayName} · {ROLE_LABEL[user.role]}. Salon profile, branches, staff aur services isi admin panel mein manage karein.</p></div><section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#050d21]"><div className="grid gap-3 sm:grid-cols-2">{[["Salon",settings.name],["Area",settings.area],["Opening hours",`${settings.openingTime} – ${settings.closingTime}`],["Weekly off",settings.offDays.join(", ")],["Branches",String(settings.branches.length)],["Services",String(settings.services.length)]].map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</span><strong className="mt-1 block text-xs text-slate-800 dark:text-white">{value}</strong></div>)}</div><button onClick={()=>startSection("salon-registry")} className="mt-4 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white">Edit salon profile & menu</button></section><section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200"><strong>Authentication status:</strong> ye workspace signed-in staff account se chalta hai. Login, role permissions aur password reset server par check hote hain — owner “Team access” se manager/reception ke logins manage karta hai.</section></div>;

  const auditPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Sample activity only</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Admin activity log</h2><p className="mt-1 text-xs text-slate-500">Ye booking-based sample activity preview hai; production audit log nahi hai.</p></div><div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21]">{bookings.slice(0,8).map((booking,index)=><div key={booking.id} className="flex items-start gap-3 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800"><span className="mt-1 h-2 w-2 rounded-full bg-emerald-500"/><div className="flex-1"><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{booking.channel==="missed_call"?"Missed-call recovery recorded":booking.channel==="waitlist"?"Waitlist booking created":"Booking in register"}</p><p className="mt-1 text-[10px] text-slate-500">{booking.customerName} · {booking.serviceName} · {bookingReference(booking)}</p></div><span className="text-[9px] text-slate-400">{booking.date} · {booking.time} · #{index+1}</span></div>)}</div></div>;

  const registryPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">New salon onboarding</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Salon registry & image uploads</h2><p className="mt-1 text-xs text-slate-500">Nayi salon ya branch register karein — poori details, staff, services aur images ek jagah.</p></div><SalonRegistry onViewDashboard={() => startSection("overview")} /></div>;

  const teamPage = <TeamAccess />;

  const activeContent = activeSection === "overview" ? overview : activeSection === "bookings" ? bookingsPage : activeSection === "inbox" ? inboxPage : activeSection === "customers" ? customersPage : activeSection === "shop" ? shopPage : activeSection === "waitlist" ? waitlistPage : activeSection === "services" ? servicesPage : activeSection === "staff" ? staffPage : activeSection === "salon-registry" ? registryPage : activeSection === "reports" ? reportsPage : activeSection === "settings" ? settingsPage : activeSection === "team" ? teamPage : auditPage;

  return <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 lg:px-7">
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[10px] leading-relaxed ${demoMode || demo ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200" : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200"}`}><span><strong>{demoMode || demo ? "SAMPLE DASHBOARD" : `SIGNED IN · ${ROLE_LABEL[user.role].toUpperCase()}`}</strong> · {demoMode || demo ? "Sample bookings only — is view par koi login required nahi. Staff logins sirf /admin mein chalte hain." : `${user.displayName} (${user.email}) ke apne role wale sections active hain. ${user.backend === "memory" ? "Salons, photos aur logins temporary memory mein hain — DATABASE_URL set karein; restart par data mit sakta hai." : "Login aur permissions server par verify hoti hain."}`}</span>{!(demoMode || demo) && <button onClick={() => void signOut()} className="shrink-0 font-bold underline">Sign out</button>}</div>
    <div className={`min-h-[72vh] overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-sm transition-[grid-template-columns] duration-200 dark:border-slate-800 dark:bg-[#030814] lg:grid ${desktopNavCollapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[230px_minmax(0,1fr)]"}`}>
      <aside id="desktop-workspace-nav" className={`hidden border-r border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-[#050d21] lg:flex lg:flex-col ${desktopNavCollapsed ? "px-2" : "px-4"}`}>
        {renderNav(desktopNavCollapsed)}
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-[#050d21] sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button ref={mobileMenuButtonRef} type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open dashboard navigation" aria-expanded={mobileNavOpen} aria-controls="mobile-workspace-nav" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:hidden"><Menu size={16} /> Menu</button>
            <button type="button" onClick={() => setDesktopNavCollapsed((collapsed) => !collapsed)} aria-label={desktopNavCollapsed ? "Expand dashboard sidebar" : "Collapse dashboard sidebar"} aria-expanded={!desktopNavCollapsed} aria-controls="desktop-workspace-nav" title={desktopNavCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:inline-flex">{desktopNavCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
            <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-widest text-[#052767] dark:text-slate-300">{settings.name} · Admin workspace</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">{demoMode || demo ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">Sample data</span> : <AccountMenu />}</div>
        </div>
        <div className="p-4 sm:p-6 lg:p-7"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-extrabold tracking-tight text-[#052767] dark:text-white sm:text-2xl">{sectionInfo.find((item)=>item.id===activeSection)?.label}</h1><p className="mt-1 text-xs font-semibold text-[#052767] dark:text-slate-300">{settings.name} · {settings.city} · {ROLE_LABEL[user.role]} view</p></div><span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>{activeWorkspace.isSample ? "Sample workspace active" : "Selected salon workspace"}</span></div>{activeContent}</div>
      </div>
    </div>
    <div className={`fixed inset-0 z-[80] transition-[visibility] lg:hidden ${mobileNavOpen ? "visible" : "invisible pointer-events-none delay-200"}`} aria-hidden={!mobileNavOpen} inert={!mobileNavOpen}>
      <button type="button" tabIndex={-1} aria-label="Close dashboard navigation" onClick={() => setMobileNavOpen(false)} className={`absolute inset-0 h-full w-full bg-slate-950/60 transition-opacity duration-200 ${mobileNavOpen ? "opacity-100" : "opacity-0"}`} />
      <aside id="mobile-workspace-nav" ref={mobileDrawerRef} role="dialog" aria-modal="true" aria-labelledby="mobile-workspace-title" className={`absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-white shadow-2xl transition-transform duration-200 ease-out dark:bg-[#050d21] ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div><span id="mobile-workspace-title" className="block text-sm font-extrabold text-[#052767] dark:text-white">Salon workspace</span><span className="mt-0.5 block text-[10px] text-slate-500 dark:text-slate-400">Navigation</span></div>
          <button ref={mobileCloseButtonRef} type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close dashboard navigation" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">{renderNav(false)}</div>
      </aside>
    </div>
    {toastMessage && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[100] max-w-sm rounded-xl border border-slate-700 bg-[#052767] p-3 text-xs font-semibold text-white shadow-xl">{toastMessage}</div>}
    {drill && <DrillDrawer spec={drill} onClose={() => setDrill(null)} />}
    {newBookingOpen && <div role="dialog" aria-modal="true" aria-labelledby="new-booking-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><form ref={bookingFormRef} onSubmit={createBooking} className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#050d21]">
      <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">{reviewRequestId ? "Website request" : "Manual appointment"}</span><h2 id="new-booking-title" className="mt-1 text-lg font-bold text-[#052767] dark:text-white">{reviewRequestId ? "Review & confirm request" : "Naya booking / slot"}</h2><p className="mt-0.5 text-[11px] text-slate-500">{reviewRequestId ? "Customer se manually confirm karein. Booking save par slot dobara check hoga; koi message send nahi hota." : "Selected service ki duration check hoti hai; save par server dobara verify karta hai."}</p></div><button type="button" aria-label="Close booking form" disabled={bookingSaving} onClick={()=>{setNewBookingOpen(false);setBookingFormError("");}} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"><X size={17}/></button></div>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Customer display name<input required readOnly={!!reviewRequestId} value={newCustomer} onChange={(event)=>setNewCustomer(event.target.value)} placeholder="Demo guest" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></label>
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Customer phone (optional)<input type="tel" readOnly={!!reviewRequestId} value={newCustomerPhone} onChange={(event)=>setNewCustomerPhone(event.target.value)} placeholder="03xx xxxxxxx" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></label>
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Branch<select disabled={!!reviewRequestId} value={newBranchId} onChange={(event)=>{ const branchId = event.target.value; setNewBranchId(branchId); setNewStaffId(activeWorkspace.settings.stylists.find((staff) => staff.id === newStaffId && (!staff.branchId || staff.branchId === branchId))?.id ?? activeWorkspace.settings.stylists.find((staff) => !staff.branchId || staff.branchId === branchId)?.id ?? ""); setBookingFormError(""); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white">{settings.branches.filter((branch) => activeBranchId === "all" || branch.id === activeBranchId).map((branch)=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Service<select disabled={!!reviewRequestId} value={newServiceId} onChange={(event)=>{setNewServiceId(event.target.value);setBookingFormError("");}} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white">{settings.services.length === 0 && <option value="">Pehle service add karein</option>}{settings.services.map((service)=><option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} min · {currency(service.pricePKR)}</option>)}</select></label>
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Stylist / chair<select value={newStaffId} onChange={(event)=>{setNewStaffId(event.target.value);setBookingFormError("");}} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white">{!newStaffId && <option value="">Is branch mein staff add karein</option>}{activeWorkspace.settings.stylists.filter((staff) => !staff.branchId || staff.branchId === newBranchId).map((staff)=><option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></label>
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          <label className="min-w-0 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Date<input required type="date" value={newDateISO} onChange={(event) => { setNewDateISO(event.target.value); setBookingFormError(""); }} className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
          <label className="min-w-0 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Time<input required value={newTime} onChange={(event)=>{setNewTime(event.target.value);setBookingFormError("");}} placeholder="04:30 PM" className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
        </div>

        {/* Live slot status */}
        {(() => {
          const stylist = activeWorkspace.settings.stylists.find((item) => item.id === newStaffId);
          const service = activeWorkspace.settings.services.find((item) => item.id === newServiceId);
          if (!stylist || !service || !newDateISO) return <p className="rounded-xl bg-amber-50 p-3 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Availability ke liye branch, staff, service aur date chunein.</p>;
          if (parseClockTime(newTime) === null) return <p className="rounded-xl bg-amber-50 p-3 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Time sahi likhein, jaise 04:30 PM.</p>;
          const stylistName = stylist.name;
          const options = { stylistId: stylist.id, branchId: newBranchId, durationMinutes: service.durationMinutes };
          const state = checkSlotAvailability(stylistName, newDateISO, newTime, options);
          if (state.available) {
            const opening = parseClockTime(settings.openingTime); const closing = parseClockTime(settings.closingTime); const start = parseClockTime(newTime)!;
            const outsideHours = opening !== null && closing !== null && closing > opening && (start < opening || start + service.durationMinutes > closing);
            return <div className="space-y-2"><div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 size={14}/> Is {service.durationMinutes} minute service ke liye koi overlapping booking nahi.</div>{outsideHours && <p className="rounded-xl bg-amber-50 p-3 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Ye service salon ke opening/closing time se bahar jaati hai — pehle confirm karein.</p>}</div>;
          }
          const alternatives = scheduleSlots(settings.openingTime, settings.closingTime).filter((slot) => checkSlotAvailability(stylistName, newDateISO, slot, options).available);
          return <div className="space-y-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/60 dark:bg-rose-950/30">
            <div className="flex items-start gap-2 text-[11px] font-bold text-rose-900 dark:text-rose-200"><AlertTriangle size={14} className="mt-0.5 shrink-0"/><span>{state.closure ? "Closed" : "Already booked"} — {newTime} ({stylistName})</span></div>
            <p className="text-[10px] leading-relaxed text-rose-800/90 dark:text-rose-200/90">{state.message}</p>
            {alternatives.length > 0 && <div><span className="text-[9px] font-extrabold uppercase tracking-wider">Koi aur slot chunein</span><div className="mt-1.5 flex flex-wrap gap-1.5">{alternatives.slice(0,6).map((slot)=><button key={slot} type="button" onClick={()=>{setNewTime(slot);setBookingFormError("");}} className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{slot}</button>)}</div></div>}
            <div className="rounded-lg bg-white/70 p-2 text-[10px] leading-relaxed text-rose-900 dark:bg-slate-900/70 dark:text-rose-200">Koi aur available slot select karein; koi message automatically send nahi hoga.</div>
          </div>;
        })()}

        {bookingFormError && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-[11px] font-semibold text-rose-700 dark:text-rose-300">{bookingFormError}</p>}
        <p className="text-[10px] text-slate-400">Koi WhatsApp message automatically send nahi hota.</p>
      </div>
      <div className="border-t border-slate-100 p-4 dark:border-slate-800"><button type="submit" disabled={bookingSaving} className="w-full rounded-lg bg-[#1CA830] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#178e29] disabled:opacity-50">{bookingSaving ? "Saving…" : reviewRequestId ? "Confirm request & add booking" : "Add booking"}</button></div>
    </form></div>}
  </div>;
}

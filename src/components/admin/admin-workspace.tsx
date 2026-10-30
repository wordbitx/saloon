"use client";

import React, { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowRight, Bell, Brush, CalendarDays, Check, CheckCircle2,
  ChevronDown, Clock3, Download, Droplets, FileBarChart2, FileSpreadsheet, Filter, Headset, Inbox,
  LayoutDashboard, LogOut, MapPin, Menu, MessageCircle, Plus, Scissors, Search, Settings2, Store,
  ShieldCheck, Sparkles, Users, UserCog, UserPlus, X, type LucideIcon,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { useAuth } from "@/context/auth-context";
import { Booking, ServiceCategory } from "@/types/salon";
import type { Capability } from "@/lib/auth/roles";
import { ROLE_LABEL } from "@/lib/auth/roles";
import AccountMenu from "@/components/admin/account-menu";
import TeamAccess from "@/components/admin/team-access";
import SalonChairTimeline from "@/components/admin/salon-chair-timeline";
import StylistWorkload from "@/components/admin/stylist-workload";
import SalonServiceMix from "@/components/admin/salon-service-mix";
import SalonCustomers from "@/components/admin/salon-customers";
import OverviewPanel from "@/components/admin/overview-panel";
import BookingTable from "@/components/admin/booking-table";
import DrillDrawer from "@/components/admin/drill-drawer";
import type { DrillSpec } from "@/lib/salon-analytics";
import SalonRegistry from "@/components/admin/salon-registry";

const categoryIcon: Record<ServiceCategory, typeof Scissors> = {
  Hair: Scissors,
  "Skin & Facial": Sparkles,
  "Makeup & Bridal": Brush,
  Nails: Droplets,
};

type Section = "overview" | "bookings" | "inbox" | "customers" | "waitlist" | "services" | "staff" | "salon-registry" | "reports" | "settings" | "audit" | "team";

const sectionInfo: { id: Section; label: string; sub: string; icon: LucideIcon; capability: Capability }[] = [
  { id: "overview", label: "Overview", sub: "Aaj ka salon snapshot", icon: LayoutDashboard, capability: "bookings.view" },
  { id: "bookings", label: "Bookings", sub: "Tamam appointments", icon: CalendarDays, capability: "bookings.view" },
  { id: "inbox", label: "Recovery inbox", sub: "Missed calls & messages", icon: Inbox, capability: "inbox.manage" },
  { id: "customers", label: "Customers", sub: "Loyal clients", icon: Users, capability: "customers.view" },
  { id: "waitlist", label: "Waitlist", sub: "Khaali slot queue", icon: Clock3, capability: "waitlist.manage" },
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

export default function AdminWorkspace({ demoMode = false }: { demoMode?: boolean }) {
  const router = useRouter();
  const { settings, bookings, waitlist, repeatCustomers, recoveredCount, recoveredRevenuePKR, addBooking, cancelBooking, completeBooking, offerWaitlistEntry, confirmWaitlistBooking, exportCsv, showToast, setActiveTab, checkSlotAvailability } = useSalon();
  const { user, can, signOut, demo } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [inboxDone, setInboxDone] = useState<string[]>([]);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [bookingFormError, setBookingFormError] = useState("");
  const [drill, setDrill] = useState<DrillSpec | null>(null);
  const openDrill = (spec: DrillSpec) => setDrill(spec);
  const [newCustomer, setNewCustomer] = useState("");
  const [newServiceId, setNewServiceId] = useState(settings.services[0]?.id ?? "");
  const [newDateISO, setNewDateISO] = useState(() => new Date().toISOString().split("T")[0]);
  const newDateInputRef = useRef<HTMLInputElement>(null);
  const formatDateLabel = (iso: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const picked = new Date(iso + "T00:00:00");
    const diff = Math.round((picked.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return picked.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };
  const [newDate, setNewDate] = useState("Today");
  const [newTime, setNewTime] = useState("04:30 PM");
  const [newStaffId, setNewStaffId] = useState(settings.stylists[0]?.id ?? "");

  const availableSections = sectionInfo.filter((section) => can(section.capability) && !(demoMode && section.id === "team"));
  const visibleBookings = useMemo(() => bookings.filter((booking) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || booking.customerName.toLowerCase().includes(query) || booking.serviceName.toLowerCase().includes(query) || booking.id.toLowerCase().includes(query);
    const matchesStatus = bookingStatus === "all" || booking.status === bookingStatus;
    const selectedBranch = settings.branches.find((branch) => branch.id === branchFilter)?.name;
    const matchesBranch = branchFilter === "all" || booking.branchName === selectedBranch;
    return matchesQuery && matchesStatus && matchesBranch;
  }), [bookings, search, bookingStatus, branchFilter, settings.branches]);

  const createBooking = (event: FormEvent) => {
    event.preventDefault();
    if (!can("bookings.create")) {
      setBookingFormError("Aap ke role ke paas booking add karne ki permission nahi hai.");
      return;
    }
    const service = settings.services.find((item) => item.id === newServiceId);
    const stylist = settings.stylists.find((item) => item.id === newStaffId);
    if (!service || !newCustomer.trim()) return;

    // Duplicate booking guard: one stylist can only hold one chair at one time.
    const stylistName = stylist?.name ?? "Unassigned";
    const slotState = checkSlotAvailability(stylistName, newDate, newTime);
    if (!slotState.available) {
      setBookingFormError(slotState.message ?? "Ye slot already booked hai.");
      return;
    }

    addBooking({
      id: `DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
      salonId: settings.id,
      customerName: newCustomer.trim(),
      customerPhone: "+92 300 0000019",
      serviceId: service.id,
      serviceName: service.name,
      stylistId: stylist?.id,
      stylistName,
      branchName: settings.branches[0]?.name,
      date: newDate,
      time: newTime,
      status: "confirmed",
      amountPKR: service.pricePKR,
      channel: "direct",
      createdAt: new Date().toISOString(),
      isRecovered: false,
      notes: "Walk-in booking created in the preview.",
    });
    setNewBookingOpen(false);
    setNewCustomer("");
    setBookingFormError("");
  };

  const startSection = (section: Section) => {
    setActiveSection(section);
    setMobileNavOpen(false);
  };

  const nav = <>
    <div className="mb-5 px-2">
      <span className="text-[9px] font-extrabold uppercase tracking-[.15em] text-slate-500 dark:text-slate-400">{demoMode ? "SALON WORKSPACE" : "SALON ADMIN"}</span>
      <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/60">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#052767] to-[#1CA830] text-sm font-bold text-white"><Scissors size={15} /></span>
        <span className="min-w-0">
          <strong className="block truncate text-xs text-slate-800 dark:text-white">{settings.name}</strong>
          <span className="mt-0.5 block text-[10px] text-slate-500">{settings.area} · {settings.branches.length} branches</span>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {user.displayName} · {ROLE_LABEL[user.role]}
      </div>
    </div>
    <div className="space-y-1">{availableSections.map(({ id, label, sub, icon: Icon }) => <button key={id} onClick={() => startSection(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${activeSection === id ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"}`}><Icon size={16} /><span className="min-w-0 flex-1"><span className="block">{label}</span><span className={`block text-[9px] font-medium ${activeSection === id ? "text-emerald-700/80 dark:text-emerald-300/80" : "text-slate-400"}`}>{sub}</span></span>{id === "inbox" && <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">3</span>}</button>)}</div>
    <div className="mt-auto space-y-1 border-t border-slate-100 pt-4 dark:border-slate-800">
      {can("settings.manage") && <button onClick={() => { setActiveTab("settings"); router.push("/settings"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70"><Settings2 size={16} />Salon setup</button>}
      <button onClick={() => { if (demoMode || demo) { router.push("/"); return; } void signOut(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"><LogOut size={16} />{demoMode || demo ? "Back to website" : "Sign out"}</button>
    </div>
  </>;

  const walkInBooking = () => {
    const service = settings.services.find((item) => item.id === "srv-3") ?? settings.services[0];
    const stylist = settings.stylists.find((item) => item.name === "Sana Tariq") ?? settings.stylists[0];
    addBooking({
      id: `WALKIN-${Math.floor(1000 + Math.random() * 9000)}`,
      salonId: settings.id,
      customerName: "Walk-in guest",
      customerPhone: "+92 300 0000019",
      serviceId: service?.id,
      serviceName: service?.name ?? "Salon service",
      stylistId: stylist?.id,
      stylistName: stylist?.name ?? "Unassigned",
      branchName: settings.branches[0]?.name,
      date: "Today",
      time: "Now",
      status: "confirmed",
      amountPKR: service?.pricePKR ?? 0,
      channel: "direct",
      createdAt: new Date().toISOString(),
      isRecovered: false,
      notes: "Walk-in guest added from the dashboard quick action.",
    });
  };

  const overview = (
    <OverviewPanel
      onDrill={openDrill}
      onNavigate={(section) => startSection(section as Section)}
      onAddBooking={() => setNewBookingOpen(true)}
      onWalkIn={walkInBooking}
      onExportCsv={exportCsv}
      inbox={sampleInbox}
      inboxPending={sampleInbox.filter((item) => !inboxDone.includes(item.id)).length}
    />
  );

  const bookingsPage = <div className="space-y-4">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Appointment register · sample records</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Bookings <span className="text-sm font-semibold text-slate-400">(chair schedule)</span></h2><p className="mt-1 text-xs text-slate-500">Filter, review, complete ya cancel karein. Complete karne par review request preview tayyar hota hai. Numbers masked hain.</p></div>{can("bookings.create") && <div className="flex gap-2"><button onClick={walkInBooking} className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-200"><UserPlus className="mr-1 inline" size={14}/>Walk-in</button><button onClick={() => setNewBookingOpen(true)} className="rounded-lg bg-[#1CA830] px-3.5 py-2.5 text-xs font-bold text-white"><Plus className="mr-1 inline" size={14}/>New booking</button></div>}</div>
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#050d21] sm:flex-row"><label className="relative flex-1"><Search size={14} className="absolute left-3 top-2.5 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find booking, customer, service..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></label><select value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="all">All branches</option>{settings.branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></div>
    <BookingTable rows={visibleBookings} />
  </div>;

  const inboxPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-300">Sample data · no messages sent</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Recovery inbox</h2><p className="mt-1 text-xs text-slate-500">Review simulated missed inquiries and mark them handled. This inbox is not connected to WhatsApp.</p></div><div className="grid gap-3">{sampleInbox.map((item) => { const handled = inboxDone.includes(item.id); return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]"><div className="flex flex-col gap-3 sm:flex-row sm:items-start"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><MessageCircle size={17}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-xs text-slate-800 dark:text-white">{item.name}</strong><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.channel}</span><span className="text-[10px] text-slate-400">{item.time}</span></div><p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.message}</p><p className="mt-2 text-[10px] text-slate-400">{item.maskedPhone} · {item.status}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => { setInboxDone((current) => current.includes(item.id) ? current : [...current, item.id]); showToast("Inbox item marked handled. No customer message sent."); }} disabled={handled} className="rounded-lg bg-[#052767] px-3 py-2 text-[10px] font-bold text-white disabled:bg-emerald-700">{handled ? "Handled" : "Mark handled"}</button><button onClick={() => showToast("TODO (owner decision): authenticated owner reply composer and approved Meta templates.")} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Owner reply preview</button></div></div></div></article>; })}</div></div>;

  const customersPage = <SalonCustomers />;

  const waitlistPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-violet-700 dark:text-violet-300">Khaali kursi recovery · simulated</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Waitlist manager</h2><p className="mt-1 text-xs text-slate-500">Offer the available slot, then simulate acceptance separately. Nothing is sent to a real customer.</p></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21]">{waitlist.map((entry) => <div key={entry.id} className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-xs text-slate-800 dark:text-white">{entry.customerName} <span className="font-normal text-slate-400">{masked(entry.customerPhone)}</span></strong><p className="mt-1 text-[11px] text-slate-500">{entry.serviceName} · {entry.preferredDate} · {entry.preferredTime}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">{entry.status}</span>{entry.status === "waiting" && <button onClick={() => offerWaitlistEntry(entry.id)} className="rounded-lg border border-violet-200 px-3 py-2 text-[10px] font-bold text-violet-700 dark:border-violet-900 dark:text-violet-300">Offer slot</button>}{entry.status === "offered" && <button onClick={() => confirmWaitlistBooking(entry.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white">Simulate accept</button>}</div></div>)}</div></div>;

  const servicesPage = <div className="space-y-4"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Active salon menu</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Services & pricing</h2><p className="mt-1 text-xs text-slate-500">Prices shown are the editable fictional salon sample list.</p></div>{can("settings.manage") && <button onClick={() => router.push("/settings")} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Edit menu settings</button>}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{settings.services.map((service) => { const CatIcon = categoryIcon[service.category] ?? Scissors; return <article key={service.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><CatIcon size={10} /> {service.category}</span><h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-white">{service.name}</h3><p className="mt-1 min-h-9 text-[10px] leading-relaxed text-slate-500">{service.description}</p><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800"><strong className="text-sm text-emerald-700 dark:text-emerald-400">{currency(service.pricePKR)}</strong><span className="text-[10px] text-slate-400">{service.durationMinutes} mins</span></div></article>; })}</div></div>;

  const staffPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300">Salon team · chair owners</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Staff & branches</h2><p className="mt-1 text-xs text-slate-500">Har stylist ki chair aur specialty — &ldquo;Hina se hi booking&rdquo; routing yahin se hoti hai. Sample configuration.</p></div><div className="grid gap-4 lg:grid-cols-2">{settings.branches.map((branch) => <section key={branch.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Branch</span><h3 className="mt-1 text-sm font-bold text-[#052767] dark:text-white">{branch.name}</h3><p className="mt-1 text-[10px] text-slate-500">{branch.area}</p><div className="mt-4 space-y-2">{settings.stylists.map((staff) => <div key={staff.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-emerald-800 dark:bg-slate-800 dark:text-emerald-300">{staff.name.slice(0,1)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-[10px] text-slate-800 dark:text-white">{staff.name}</strong><span className="block truncate text-[9px] text-slate-500">{staff.specialty}</span></span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">SAMPLE</span></div>)}</div></section>)}</div></div>;

  const reportsPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300">Owner reporting</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Reports & exports</h2><p className="mt-1 text-xs text-slate-500">Summary is calculated from demo bookings and can be downloaded as CSV.</p></div><div className="grid gap-3 sm:grid-cols-3">{[{label:"Recovered bookings",value:String(recoveredCount)},{label:"Recovered service value",value:currency(recoveredRevenuePKR)},{label:"Waitlist currently waiting",value:String(waitlist.filter((entry)=>entry.status==="waiting").length)}].map((card)=><div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</span><strong className="mt-3 block text-xl font-extrabold text-[#052767] dark:text-white">{card.value}</strong></div>)}</div><section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#050d21] sm:flex-row sm:items-center"><div><h3 className="text-sm font-bold text-[#052767] dark:text-white">Booking recovery export</h3><p className="mt-1 text-xs text-slate-500">CSV includes sample booking data and masked phone numbers.</p></div><button onClick={exportCsv} className="rounded-lg bg-[#052767] px-4 py-2.5 text-xs font-bold text-white"><Download className="mr-1.5 inline" size={14}/>Download sample CSV</button></section></div>;

  const settingsPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Workspace configuration</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Admin settings</h2><p className="mt-1 text-xs text-slate-500">Signed in as {user.displayName} · {ROLE_LABEL[user.role]}. Salon profile and menu configuration are managed separately.</p></div><section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#050d21]"><div className="grid gap-3 sm:grid-cols-2">{[["Salon",settings.name],["Area",settings.area],["Opening hours",`${settings.openingTime} – ${settings.closingTime}`],["Weekly off",settings.offDays.join(", ")],["Branches",String(settings.branches.length)],["Services",String(settings.services.length)]].map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</span><strong className="mt-1 block text-xs text-slate-800 dark:text-white">{value}</strong></div>)}</div><button onClick={()=>router.push("/settings")} className="mt-4 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white">Edit salon profile & menu</button></section><section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200"><strong>Authentication status:</strong> ye workspace signed-in staff account se chalta hai. Login, role permissions aur password reset server par check hote hain — owner “Team access” se manager/reception ke logins manage karta hai.</section></div>;

  const auditPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Sample activity only</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Admin activity log</h2><p className="mt-1 text-xs text-slate-500">No actions are persisted beyond the current browser demo session.</p></div><div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21]">{bookings.slice(0,8).map((booking,index)=><div key={booking.id} className="flex items-start gap-3 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800"><span className="mt-1 h-2 w-2 rounded-full bg-emerald-500"/><div className="flex-1"><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{booking.channel==="missed_call"?"Missed-call recovery recorded":booking.channel==="waitlist"?"Waitlist booking created":"Recovery booking in sample register"}</p><p className="mt-1 text-[10px] text-slate-500">{booking.customerName} · {booking.serviceName} · {booking.id}</p></div><span className="text-[9px] text-slate-400">{booking.date} · {booking.time} · #{index+1}</span></div>)}</div></div>;

  const registryPage = <div className="space-y-4"><div><span className="text-[9px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">New salon onboarding</span><h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Salon registry & image uploads</h2><p className="mt-1 text-xs text-slate-500">Nayi salon ya branch register karein — poori details, staff, services aur images ek jagah.</p></div><SalonRegistry /></div>;

  const teamPage = <TeamAccess />;

  const activeContent = activeSection === "overview" ? overview : activeSection === "bookings" ? bookingsPage : activeSection === "inbox" ? inboxPage : activeSection === "customers" ? customersPage : activeSection === "waitlist" ? waitlistPage : activeSection === "services" ? servicesPage : activeSection === "staff" ? staffPage : activeSection === "salon-registry" ? registryPage : activeSection === "reports" ? reportsPage : activeSection === "settings" ? settingsPage : activeSection === "team" ? teamPage : auditPage;

  return <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 lg:px-7">
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[10px] leading-relaxed ${demoMode || demo ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200" : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200"}`}><span><strong>{demoMode || demo ? "SAMPLE DASHBOARD" : `SIGNED IN · ${ROLE_LABEL[user.role].toUpperCase()}`}</strong> · {demoMode || demo ? "Sample bookings only — is view par koi login required nahi. Staff logins sirf /admin mein chalte hain." : `${user.displayName} (${user.email}) ke apne role wale sections active hain. ${user.backend === "memory" ? "Staff logins temporary storage mein hain — DATABASE_URL set karein." : "Login aur permissions server par verify hoti hain."}`}</span>{!(demoMode || demo) && <button onClick={() => void signOut()} className="shrink-0 font-bold underline">Sign out</button>}</div>
    <div className="min-h-[72vh] overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-sm dark:border-slate-800 dark:bg-[#030814] lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21] lg:flex lg:flex-col">{nav}</aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#050d21] sm:px-6"><div className="flex items-center gap-2"><button onClick={()=>setMobileNavOpen((open)=>!open)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:hidden" aria-label="Toggle admin navigation"><Menu size={14}/> Menu</button><span className="text-[10px] font-bold uppercase tracking-widest text-[#052767] dark:text-slate-300">{settings.name} · Admin workspace</span></div><div className="flex items-center gap-2">{demoMode || demo ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">Sample data</span> : <AccountMenu />}</div></div>
        {mobileNavOpen && <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21] lg:hidden animate-in slide-in-from-top duration-200"><div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-[#052767] dark:text-slate-300">Navigation</span><button onClick={()=>setMobileNavOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close menu"><X size={14}/></button></div>{nav}</div>}
        <div className="p-4 sm:p-6 lg:p-7"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-extrabold tracking-tight text-[#052767] dark:text-white sm:text-2xl">{sectionInfo.find((item)=>item.id===activeSection)?.label}</h1><p className="mt-1 text-xs font-semibold text-[#052767] dark:text-slate-300">{settings.name} · {settings.city} · {ROLE_LABEL[user.role]} view</p></div><span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Sample workspace active</span></div>{activeContent}</div>
      </div>
    </div>
    {drill && <DrillDrawer spec={drill} onClose={() => setDrill(null)} />}
    {newBookingOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><form onSubmit={createBooking} className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#050d21]">
      <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Manual entry · sample</span><h2 className="mt-1 text-lg font-bold text-[#052767] dark:text-white">Naya booking / slot</h2><p className="mt-0.5 text-[11px] text-slate-500">Slot live check hota hai — duplicate booking block ho jati hai.</p></div><button type="button" onClick={()=>{setNewBookingOpen(false);setBookingFormError("");}} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17}/></button></div>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Customer display name<input required value={newCustomer} onChange={(event)=>setNewCustomer(event.target.value)} placeholder="Demo guest" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></label>
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Service<select value={newServiceId} onChange={(event)=>setNewServiceId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white">{settings.services.map((service)=><option key={service.id} value={service.id}>{service.name} · {currency(service.pricePKR)}</option>)}</select></label>
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Stylist / chair<select value={newStaffId} onChange={(event)=>{setNewStaffId(event.target.value);setBookingFormError("");}} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white">{settings.stylists.map((staff)=><option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Date<div className="mt-1 relative"><button type="button" onClick={() => newDateInputRef.current?.click()} className="inline-flex w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><CalendarDays size={13} className="text-[#1CA830]" /> {newDate}</button><input ref={newDateInputRef} type="date" value={newDateISO} onChange={(event) => { if (event.target.value) { setNewDateISO(event.target.value); setNewDate(formatDateLabel(event.target.value)); setBookingFormError(""); } }} className="hidden" /></div></label><label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Time<input value={newTime} onChange={(event)=>{setNewTime(event.target.value);setBookingFormError("");}} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></label></div>

        {/* Live slot status */}
        {(() => {
          const stylistName = settings.stylists.find((item) => item.id === newStaffId)?.name ?? "Unassigned";
          const state = checkSlotAvailability(stylistName, newDate, newTime);
          if (state.available) {
            return <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 size={14}/> Ye slot khali hai — book kar sakte hain.</div>;
          }
          const alternatives = ["11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM","07:00 PM","08:00 PM"].filter((slot) => {
            const conflict = checkSlotAvailability(stylistName, newDate, slot);
            return conflict.available;
          });
          return <div className="space-y-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/60 dark:bg-rose-950/30">
            <div className="flex items-start gap-2 text-[11px] font-bold text-rose-900 dark:text-rose-200"><AlertTriangle size={14} className="mt-0.5 shrink-0"/><span>Already booked — {newTime} ({stylistName})</span></div>
            <p className="text-[10px] leading-relaxed text-rose-800/90 dark:text-rose-200/90">{state.message}</p>
            {alternatives.length > 0 && <div><span className="text-[9px] font-extrabold uppercase tracking-wider">Koi aur slot chunein</span><div className="mt-1.5 flex flex-wrap gap-1.5">{alternatives.slice(0,6).map((slot)=><button key={slot} type="button" onClick={()=>{setNewTime(slot);setBookingFormError("");}} className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{slot}</button>)}</div></div>}
            <div className="rounded-lg bg-white/70 p-2 text-[10px] leading-relaxed text-rose-900 dark:bg-slate-900/70 dark:text-rose-200"><strong>WhatsApp:</strong> client ko WhatsApp par contact karein — same slot confirm karne ke liye.</div>
          </div>;
        })()}

        {bookingFormError && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-[11px] font-semibold text-rose-700 dark:text-rose-300">{bookingFormError}</p>}
        <p className="text-[10px] text-slate-400">Phone number remains masked. No WhatsApp message is sent.</p>
      </div>
      <div className="border-t border-slate-100 p-4 dark:border-slate-800"><button type="submit" className="w-full rounded-lg bg-[#1CA830] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#178e29]">Add sample booking</button></div>
    </form></div>}
  </main>;
}

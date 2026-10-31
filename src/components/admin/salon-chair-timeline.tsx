"use client";

import React, { useId, useState } from "react";
import {
  Armchair, Clock3, Scissors, Sparkles, Droplets, Brush, Plus,
  MessageCircle, AlertTriangle, Check, CalendarDays, ChevronDown, RefreshCw, Search,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { useWorkspaces } from "@/context/workspace-context";
import { useAuth } from "@/context/auth-context";
import { bookingReference, findBookingConflict, findScheduleClosure, formatClockTime, karachiToday, parseClockTime, scheduleDateKey, scheduleDateLabel, scheduleSlots, type BookingSlotSelection } from "@/lib/booking-schedule";
import BookingTable from "@/components/admin/booking-table";
import { ScheduleBlockDialog, ScheduleClosureList } from "@/components/admin/schedule-closures";
import type { DrillSpec } from "@/lib/salon-analytics";
import type { ServiceCategory, Stylist } from "@/types/salon";

const categoryMeta: Record<ServiceCategory, { icon: typeof Scissors; tint: string; chip: string }> = {
  Hair: { icon: Scissors, tint: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300", chip: "bg-blue-600" },
  "Skin & Facial": { icon: Sparkles, tint: "bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-200", chip: "bg-fuchsia-600" },
  "Makeup & Bridal": { icon: Brush, tint: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300", chip: "bg-rose-600" },
  Nails: { icon: Droplets, tint: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300", chip: "bg-violet-600" },
};

const currency = (amount: number) => `PKR ${amount.toLocaleString("en-PK")}`;

// Neutral by default, with a green border only when a bookable slot is hovered or focused.
const availableSlotClass = "flex min-h-[34px] w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-2 py-1.5 text-[9px] font-semibold text-slate-500 transition-colors hover:border-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-400 dark:hover:border-emerald-500";

export default function SalonChairTimeline({
  onAddBooking,
  onSelectSlot,
  onOpenDrill,
  showRecords = true,
}: {
  onAddBooking?: () => void;
  onSelectSlot?: (slot: BookingSlotSelection) => void;
  onOpenDrill?: (spec: DrillSpec) => void;
  showRecords?: boolean;
}) {
  const { settings, bookings, showToast, checkSlotAvailability } = useSalon();
  const { can } = useAuth();
  const { activeWorkspace, activeBranchId, refreshWorkspaces, demo } = useWorkspaces();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDateISO, setSelectedDateISO] = useState(karachiToday);
  const selectedDay = scheduleDateLabel(selectedDateISO);
  const slots = scheduleSlots(settings.openingTime, settings.closingTime);
  const [expandRecords, setExpandRecords] = useState(true);
  const [recordQuery, setRecordQuery] = useState("");
  const timeOffPanelId = useId();
  const [showTimeOff, setShowTimeOff] = useState(false);
  const [blockDraft, setBlockDraft] = useState<{ dateISO: string; stylistId?: string; time?: string } | null>(null);
  const [conflictSlot, setConflictSlot] = useState<{
    stylistId: string; stylist: string; time: string; message: string; alternatives: { time: string; branchId: string }[]; date: string; dateISO: string;
  } | null>(null);

  const stylists = settings.stylists;
  const dayBookings = bookings.filter((booking) => scheduleDateKey(booking.date) === selectedDateISO && booking.status !== "cancelled");

  // A shared stylist can be busy in another branch. Show all appointments
  // beginning in a cell, not just the first overlap with that hour.
  const getOverlaps = (stylist: Stylist, slot: string) => [...activeWorkspace.bookings, ...(activeWorkspace.externalBusy ?? [])]
    .filter((booking) => !!findBookingConflict([booking], activeWorkspace.settings.services, stylist.name, selectedDateISO, slot, undefined, { stylistId: stylist.id, durationMinutes: 60 }))
    .sort((a, b) => (parseClockTime(a.time) ?? 0) - (parseClockTime(b.time) ?? 0));
  const branchesFor = (stylist: Stylist) => activeBranchId !== "all" ? [activeBranchId] : stylist.branchId ? [stylist.branchId] : activeWorkspace.settings.branches.map((branch) => branch.id);
  const freeBranchFor = (stylist: Stylist, time: string, durationMinutes = 60) => branchesFor(stylist).find((branchId) => checkSlotAvailability(stylist.name, selectedDateISO, time, { stylistId: stylist.id, branchId, durationMinutes }).available);
  const closureFor = (stylist: Stylist, time: string) => {
    const closures = branchesFor(stylist).map((branchId) => findScheduleClosure(activeWorkspace.settings, activeWorkspace.scheduleBlocks ?? [], { branchId, stylistId: stylist.id, stylistName: stylist.name }, selectedDateISO, time, 60));
    return closures.length && closures.every(Boolean) ? closures[0] : null;
  };
  const getAlternatives = (stylist: Stylist) => slots.flatMap((time) => {
    const branchId = freeBranchFor(stylist, time);
    return branchId ? [{ time, branchId }] : [];
  });
  const minServiceDuration = settings.services.length ? Math.min(...settings.services.map((service) => service.durationMinutes)) : 0;
  const findPartialOpening = (stylist: Stylist, slot: string) => {
    if (!minServiceDuration) return null;
    const first = parseClockTime(slot);
    if (first === null) return null;
    // Offer a useful gap even when two shorter appointments share this hour.
    for (let minute = first; minute < Math.min(first + 60, 1440); minute += 15) {
      const time = formatClockTime(minute);
      const branchId = freeBranchFor(stylist, time, minServiceDuration);
      if (branchId) return { time, branchId };
    }
    return null;
  };

  const handleBlockedSlot = (stylist: Stylist, slot: string, customerName: string, serviceName: string, branchName?: string) => {
    setConflictSlot({
      stylistId: stylist.id, stylist: stylist.name, time: slot, date: selectedDay, dateISO: selectedDateISO,
      alternatives: getAlternatives(stylist),
      message: customerName === "Unavailable" ? `Ye staff ${selectedDay} · ${slot} par available nahi hai. Doosra available slot chunein.` : `Ye slot (${selectedDay} · ${slot}) ${branchName ? `${branchName} mein ` : ""}already booked hai — ${customerName} ka ${serviceName}. Doosra available slot chunein.`,
    });
  };

  const stylistLoad = stylists.map((stylist) => {
    const assigned = dayBookings.filter((booking) => booking.stylistId ? booking.stylistId === stylist.id : booking.stylistName === stylist.name);
    return { ...stylist, assigned: assigned.length, revenue: assigned.reduce((sum, booking) => sum + booking.amountPKR, 0) };
  });

  const totalChairs = stylists.length;
  const busyChairs = stylistLoad.filter((stylist) => stylist.assigned > 0).length;
  const emptySlots = stylists.reduce((count, stylist) => count + slots.filter((slot) => !!freeBranchFor(stylist, slot)).length, 0);
  const dayValue = dayBookings.reduce((sum, booking) => sum + booking.amountPKR, 0);

  const dayRecords = bookings
    .filter((booking) => scheduleDateKey(booking.date) === selectedDateISO)
    .filter((booking) => {
      const query = recordQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        booking.customerName.toLowerCase().includes(query) ||
        booking.serviceName.toLowerCase().includes(query) ||
        booking.stylistName.toLowerCase().includes(query) ||
        bookingReference(booking).toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => (parseClockTime(a.time) ?? 9999) - (parseClockTime(b.time) ?? 9999));

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21]">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">
              <Armchair size={12} /> Salon floor · chair schedule
            </span>
            <h3 className="mt-1 text-base font-bold text-[#052767] dark:text-white">Chair timeline — har kursi ka schedule</h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {settings.openingTime} se {settings.closingTime} tak. Available slot par click karein aur booking banayein.
            </p>
          </div>
          {onAddBooking && (
            <button onClick={onAddBooking} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1CA830] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#178e29] active:scale-95">
              <Plus size={12} /> Walk-in / naya slot
            </button>
          )}
        </div>

        {/* Day tabs + counters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <CalendarDays size={12} className="text-emerald-600" />
              <span className="sr-only">Chair schedule date</span>
              <input aria-label="Chair schedule date" type="date" value={selectedDateISO} onChange={(event) => { if (event.target.value) setSelectedDateISO(event.target.value); }} className="min-w-0 bg-transparent text-[11px] outline-none" />
            </label>
            <span className="text-[10px] font-semibold text-slate-500">{selectedDay}</span>
            {can("schedule.manage") && <button type="button" aria-expanded={showTimeOff} aria-controls={timeOffPanelId} onClick={() => setShowTimeOff((open) => !open)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300">Time off <ChevronDown size={11} className={`transition-transform ${showTimeOff ? "rotate-180" : ""}`} /></button>}
            {!demo && <button type="button" disabled={refreshing} onClick={() => { setRefreshing(true); void refreshWorkspaces().finally(() => setRefreshing(false)); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"><RefreshCw size={11} className={refreshing ? "animate-spin" : ""} /> Refresh availability</button>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Armchair size={12} /> {busyChairs}/{totalChairs} chairs busy
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Clock3 size={12} className="text-slate-500 dark:text-slate-400" /> {emptySlots} slots available
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
              {currency(dayValue)}
            </span>
          </div>
        </div>
        <div id={timeOffPanelId} hidden={!showTimeOff}>{showTimeOff && <ScheduleClosureList selectedDate={selectedDateISO} onAdd={() => setBlockDraft({ dateISO: selectedDateISO })} />}</div>
      </div>

      {/* Timeline grid; on small screens only the schedule scrolls sideways. */}
      {stylists.length === 0 ? <p className="px-4 py-8 text-center text-xs text-slate-500">Is branch mein koi staff nahi. Pehle Salon registry mein staff add karein.</p> : <div className="overflow-x-auto" aria-label="Chair schedule">
        <div style={{ minWidth: Math.max(720, 92 + stylists.length * 150) }}>
          <div className="grid border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50" style={{ gridTemplateColumns: `92px repeat(${stylists.length}, minmax(150px, 1fr))` }}>
            <div className="px-3 py-2.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</div>
            {stylists.map((stylist) => {
              const load = stylistLoad.find((entry) => entry.id === stylist.id);
              return (
                <div key={stylist.id} className="border-l border-slate-100 px-2.5 py-2.5 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {stylist.photoDataUrl ? (
                      // Uploaded data URLs are kept local to the authenticated workspace.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={stylist.photoDataUrl} alt={`${stylist.name} photo`} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                    ) : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#052767] text-[10px] font-bold text-white">{stylist.name.slice(0, 1)}</span>}
                    <div className="min-w-0">
                      <button type="button" onClick={() => onOpenDrill?.({ title: stylist.name, subtitle: `${stylist.specialty} · chair bookings`, defaultToday: false, filter: (b) => b.stylistName === stylist.name })} className="block max-w-full truncate text-left text-[11px] font-bold text-[#052767] underline-offset-2 hover:underline dark:text-white">{stylist.name}</button>
                      <span className="block truncate text-[9px] text-slate-500 dark:text-slate-400">{load?.assigned ?? 0} booked · {currency(load?.revenue ?? 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {slots.map((slot, rowIdx) => (
            <div key={slot} className={`grid ${rowIdx !== slots.length - 1 ? "border-b border-slate-50 dark:border-slate-800/60" : ""}`} style={{ gridTemplateColumns: `92px repeat(${stylists.length}, minmax(150px, 1fr))` }}>
              <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <Clock3 size={11} className="text-slate-500 dark:text-slate-400" /> {slot}
              </div>
              {stylists.map((stylist) => {
                const overlaps = getOverlaps(stylist, slot);
                const cellStart = parseClockTime(slot) ?? 0;
                const isOtherBranch = (booking: typeof overlaps[number]) => activeBranchId !== "all" && !!booking.branchId && booking.branchId !== activeBranchId;
                const startsHere = (booking: typeof overlaps[number]) => {
                  const start = parseClockTime(booking.time);
                  return scheduleDateKey(booking.date) === selectedDateISO && start !== null && start >= cellStart && start < cellStart + 60;
                };
                const starting = overlaps.filter((booking) => startsHere(booking) && !isOtherBranch(booking));
                const continuing = overlaps.filter((booking) => !startsHere(booking) && !isOtherBranch(booking));
                const elsewhere = overlaps.filter(isOtherBranch);
                const closure = closureFor(stylist, slot);
                const empty = overlaps.length === 0 && !closure;
                const freeBranch = empty ? freeBranchFor(stylist, slot) : undefined;
                const partial = !empty && onSelectSlot ? findPartialOpening(stylist, slot) : null;
                return <div key={stylist.id} className="space-y-1 border-l border-slate-50 px-1.5 py-1.5 dark:border-slate-800/60">
                  {starting.map((booking) => {
                    const service = settings.services.find((item) => booking.serviceId ? item.id === booking.serviceId : item.name === booking.serviceName);
                    const meta = categoryMeta[(service?.category ?? "Hair") as ServiceCategory];
                    const Icon = meta.icon;
                    const branchName = activeWorkspace.settings.branches.find((branch) => branch.id === booking.branchId)?.name;
                    return <button key={booking.id} type="button" onClick={() => handleBlockedSlot(stylist, booking.time, booking.customerName, booking.serviceName, branchName)} aria-label={`Booked ${booking.time} with ${stylist.name}, ${bookingReference(booking)}; view details`} title="Booking details" className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[9px] font-bold shadow-sm transition hover:ring-2 hover:ring-fuchsia-300 ${meta.tint}`}>
                      <Icon size={11} className="shrink-0" /><span className="min-w-0 flex-1"><span className="block truncate">{booking.customerName} · {booking.time}</span><span className="block truncate text-[8px] font-semibold opacity-75">{booking.serviceName} · {bookingReference(booking)}</span></span><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.chip}`} />
                    </button>;
                  })}
                  {continuing.length > 0 && <button type="button" onClick={() => handleBlockedSlot(stylist, slot, continuing[0].customerName, continuing[0].serviceName, activeWorkspace.settings.branches.find((branch) => branch.id === continuing[0].branchId)?.name)} aria-label={`Busy ${slot} with ${stylist.name}; appointment continues`} className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-2 text-[9px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><Clock3 size={10} /> Busy · continues</button>}
                  {elsewhere.length > 0 && <button type="button" onClick={() => handleBlockedSlot(stylist, slot, elsewhere[0].customerName, elsewhere[0].serviceName, activeWorkspace.settings.branches.find((branch) => branch.id === elsewhere[0].branchId)?.name)} aria-label={elsewhere[0].customerName === "Unavailable" ? `Busy ${slot} with ${stylist.name}` : `Busy ${slot} with ${stylist.name} at another branch`} className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-2 text-[9px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><Clock3 size={10} /> {elsewhere[0].customerName === "Unavailable" ? "Busy" : "Busy · other branch"}</button>}
                  {closure && <div title={closure.label} className="flex min-h-[34px] items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-center text-[9px] font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">{partial ? "Part closed" : "Closed"} · {closure.label}</div>}
                  {empty && (onSelectSlot && freeBranch ? <button type="button" disabled={settings.services.length === 0} onClick={() => onSelectSlot({ stylistId: stylist.id, branchId: freeBranch, dateISO: selectedDateISO, time: slot })} aria-label={`Book available ${slot} with ${stylist.name}`} title={settings.services.length === 0 ? "Pehle service add karein" : `Book ${stylist.name} at ${slot}`} className={`${availableSlotClass} cursor-pointer`}>Available</button> : <span className="flex min-h-[34px] w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-[9px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-400">Available</span>)}
                  {partial && <button type="button" onClick={() => onSelectSlot?.({ stylistId: stylist.id, branchId: partial.branchId, dateISO: selectedDateISO, time: partial.time })} aria-label={`Book available ${partial.time} with ${stylist.name}`} className={`${availableSlotClass} cursor-pointer`}>Available · {partial.time}</button>}
                </div>;
              })}
            </div>
          ))}
        </div>
      </div>}
      {stylists.length > 0 && settings.services.length === 0 && <p className="px-4 py-2 text-[10px] font-semibold text-amber-700 dark:text-amber-300">Booking ke liye pehle Salon registry mein service add karein.</p>}
      {stylists.length > 0 && <p className="px-4 pt-2 text-[10px] text-slate-400 sm:hidden">Chairs dekhne ke liye schedule ko left/right swipe karein.</p>}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
          {(Object.keys(categoryMeta) as ServiceCategory[]).map((cat) => {
            const meta = categoryMeta[cat];
            const Icon = meta.icon;
            return <span key={cat} className="inline-flex items-center gap-1"><Icon size={11} /> {cat}</span>;
          })}
        </div>
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-500"><Clock3 size={11} /> Busy = service continues.</span>
      </div>

      {/* Day records — full booking table with actions */}
      {showRecords && <div className="border-t border-slate-100 dark:border-slate-800">
        <button onClick={() => setExpandRecords((open) => !open)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
          <span className="flex items-center gap-2 text-[11px] font-bold text-[#052767] dark:text-white">
            <CalendarDays size={13} className="text-[#1CA830]" />
            {selectedDay} ki saari bookings ({dayRecords.length})
          </span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandRecords ? "rotate-180" : ""}`} />
        </button>
        {expandRecords && (
          <div className="space-y-3 px-4 pb-4">
            <label className="relative block">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                value={recordQuery}
                onChange={(event) => setRecordQuery(event.target.value)}
                placeholder="Client, service, stylist ya booking ID se search karein…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[11px] outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <BookingTable rows={dayRecords} compact emptyText="Is din ke liye koi record nahi mila." />
          </div>
        )}
      </div>}

      {blockDraft && <ScheduleBlockDialog draft={blockDraft} onClose={() => setBlockDraft(null)} />}

      {/* Duplicate booking guard modal */}
      {conflictSlot && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#050d21]">
            <div className="flex items-start gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"><AlertTriangle size={19} /></span>
              <div className="min-w-0">
                <span className="text-[9px] font-extrabold uppercase tracking-[.14em] text-rose-700 dark:text-rose-300">Already booked</span>
                <h3 id="conflict-title" className="mt-1 text-lg font-bold text-[#052767] dark:text-white">{conflictSlot.date} · {conflictSlot.time} — {conflictSlot.stylist}</h3>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] leading-relaxed text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{conflictSlot.message}</p>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#052767] dark:text-white"><MessageCircle size={13} className="text-[#1CA830]" /> Client ko WhatsApp par contact karein</span>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  &ldquo;Aap ka {conflictSlot.time} slot {conflictSlot.stylist} ke sath abhi book hai. Koi aur same-time slot chahiye to confirm kar lein.&rdquo;
                </p>
                <button onClick={() => { const message = `Aap ka ${conflictSlot.time} slot ${conflictSlot.stylist} ke sath abhi book hai. Koi aur slot chahiye to confirm kar lein.`; if (!navigator.clipboard) { showToast("Copy available nahi. Message manually select kar lein."); return; } void navigator.clipboard.writeText(message).then(() => showToast("Message copy ho gaya — WhatsApp send nahi hua."), () => showToast("Copy nahi hua. Message manually select kar lein.")); }} className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#1CA830] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#178e29]">
                  <MessageCircle size={12} /> WhatsApp message copy karein
                </button>
              </div>
              {onSelectSlot && conflictSlot.alternatives.length > 0 && (
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">In slots mein book kar sakte hain</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {conflictSlot.alternatives.slice(0, 6).map((alt) => (
                      <button key={`${alt.time}-${alt.branchId}`} onClick={() => { onSelectSlot({ stylistId: conflictSlot.stylistId, branchId: alt.branchId, dateISO: conflictSlot.dateISO, time: alt.time }); setConflictSlot(null); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Check size={11} /> {alt.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setConflictSlot(null)} className="w-full rounded-lg border border-slate-200 py-2.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Band karein</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

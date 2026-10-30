"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Armchair, Clock3, Coffee, Scissors, Sparkles, Droplets, Brush, Plus,
  MessageCircle, AlertTriangle, Check, CalendarDays, ChevronDown, Search,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import BookingTable from "@/components/admin/booking-table";
import type { DrillSpec } from "@/lib/salon-analytics";
import { ServiceCategory } from "@/types/salon";

const categoryMeta: Record<ServiceCategory, { icon: typeof Scissors; tint: string; chip: string }> = {
  Hair: { icon: Scissors, tint: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300", chip: "bg-blue-600" },
  "Skin & Facial": { icon: Sparkles, tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", chip: "bg-emerald-600" },
  "Makeup & Bridal": { icon: Brush, tint: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300", chip: "bg-rose-600" },
  Nails: { icon: Droplets, tint: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300", chip: "bg-violet-600" },
};

const SLOT_TIMES = [
  "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM",
];

function parseSlotToHour(slot: string): number | null {
  const match = slot.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM") hour += 12;
  else if (!meridiem && hour < 8) hour += 12;
  return hour;
}

const currency = (amount: number) => `PKR ${amount.toLocaleString("en-PK")}`;

export default function SalonChairTimeline({
  onAddBooking,
  onOpenDrill,
}: {
  onAddBooking?: () => void;
  onOpenDrill?: (spec: DrillSpec) => void;
}) {
  const { settings, bookings, showToast } = useSalon();

  // Date picker: defaults to today, lets the owner navigate to any date (past/future).
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [selectedDateISO, setSelectedDateISO] = useState(() => new Date().toISOString().split("T")[0]);

  const formatDateLabel = (iso: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const picked = new Date(iso + "T00:00:00");
    const diff = Math.round((picked.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return picked.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  const selectedDay = formatDateLabel(selectedDateISO);
  const [expandRecords, setExpandRecords] = useState(true);
  const [recordQuery, setRecordQuery] = useState("");
  const [conflictSlot, setConflictSlot] = useState<{
    stylist: string; time: string; message: string; alternatives: string[]; date: string;
  } | null>(null);

  const stylists = settings.stylists;
  const dayBookings = bookings.filter((booking) => booking.date === selectedDay && booking.status !== "cancelled");

  const getBookingFor = (stylistName: string, slot: string) => {
    const slotHour = parseSlotToHour(slot);
    if (slotHour === null) return undefined;
    return dayBookings.find((booking) => {
      const bookingHour = parseSlotToHour(booking.time);
      return booking.stylistName === stylistName && bookingHour === slotHour;
    });
  };

  const getAlternatives = (stylistName: string, bookedTime: string) => {
    const bookedHour = parseSlotToHour(bookedTime);
    return SLOT_TIMES.filter((slot) => {
      const hour = parseSlotToHour(slot);
      if (hour === null || hour === bookedHour) return false;
      return !getBookingFor(stylistName, slot);
    });
  };

  const handleBlockedSlot = (stylistName: string, slot: string, customerName: string, serviceName: string) => {
    setConflictSlot({
      stylist: stylistName,
      time: slot,
      date: selectedDay,
      alternatives: getAlternatives(stylistName, slot),
      message: `Ye slot (${selectedDay} · ${slot}) already booked hai — ${customerName} ka ${serviceName}. Is waqt par dobara book karne ke liye customer ko WhatsApp par contact karein, ya in alternatives mein se koi slot chunein.`,
    });
  };

  const stylistLoad = stylists.map((stylist) => {
    const assigned = dayBookings.filter((booking) => booking.stylistName === stylist.name);
    return { ...stylist, assigned: assigned.length, revenue: assigned.reduce((sum, booking) => sum + booking.amountPKR, 0) };
  });

  const totalChairs = stylists.length;
  const busyChairs = stylistLoad.filter((stylist) => stylist.assigned > 0).length;
  const emptySlots = SLOT_TIMES.length * totalChairs - dayBookings.length;
  const dayValue = dayBookings.reduce((sum, booking) => sum + booking.amountPKR, 0);

  const dayRecords = bookings
    .filter((booking) => booking.date === selectedDay)
    .filter((booking) => {
      const query = recordQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        booking.customerName.toLowerCase().includes(query) ||
        booking.serviceName.toLowerCase().includes(query) ||
        booking.stylistName.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => (parseSlotToHour(a.time) ?? 99) - (parseSlotToHour(b.time) ?? 99));

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
              {settings.openingTime} se {settings.closingTime} tak. Har column aik stylist ki chair hai. Booked slot par click karein to duplicate-booking guard chalta hai.
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
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => dateInputRef.current?.click()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <CalendarDays size={11} /> {selectedDay}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDateISO}
              onChange={(event) => {
                if (event.target.value) setSelectedDateISO(event.target.value);
              }}
              className="hidden"
            />
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
      </div>

      {/* Timeline grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50" style={{ gridTemplateColumns: `92px repeat(${stylists.length}, minmax(0, 1fr))` }}>
            <div className="px-3 py-2.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</div>
            {stylists.map((stylist) => {
              const load = stylistLoad.find((entry) => entry.id === stylist.id);
              return (
                <div key={stylist.id} className="border-l border-slate-100 px-2.5 py-2.5 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#052767] text-[10px] font-bold text-white">{stylist.name.slice(0, 1)}</span>
                    <div className="min-w-0">
                      <button type="button" onClick={() => onOpenDrill?.({ title: stylist.name, subtitle: `${stylist.specialty} · chair bookings`, defaultToday: false, filter: (b) => b.stylistName === stylist.name })} className="block max-w-full truncate text-left text-[11px] font-bold text-[#052767] underline-offset-2 hover:underline dark:text-white">{stylist.name}</button>
                      <span className="block truncate text-[9px] text-slate-500 dark:text-slate-400">{load?.assigned ?? 0} booked · {currency(load?.revenue ?? 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {SLOT_TIMES.map((slot, rowIdx) => (
            <div key={slot} className={`grid ${rowIdx !== SLOT_TIMES.length - 1 ? "border-b border-slate-50 dark:border-slate-800/60" : ""}`} style={{ gridTemplateColumns: `92px repeat(${stylists.length}, minmax(0, 1fr))` }}>
              <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <Clock3 size={11} className="text-slate-500 dark:text-slate-400" /> {slot}
              </div>
              {stylists.map((stylist) => {
                const booking = getBookingFor(stylist.name, slot);
                if (booking) {
                  const service = settings.services.find((item) => item.name === booking.serviceName);
                  const meta = categoryMeta[(service?.category ?? "Hair") as ServiceCategory];
                  const Icon = meta.icon;
                  return (
                    <div key={stylist.id} className="border-l border-slate-50 px-1.5 py-1.5 dark:border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => handleBlockedSlot(stylist.name, slot, booking.customerName, booking.serviceName)}
                        title="Slot already booked — click for details"
                        className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[9px] font-bold shadow-sm transition hover:ring-2 hover:ring-rose-300 ${meta.tint}`}
                      >
                        <Icon size={11} className="shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{booking.customerName}</span>
                          <span className="block truncate text-[8px] font-semibold opacity-70">{booking.serviceName}</span>
                        </span>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.chip}`} />
                      </button>
                    </div>
                  );
                }
                return (
                  <div key={stylist.id} className="border-l border-slate-50 px-1.5 py-1.5 dark:border-slate-800/60">
                    <div className="flex h-[34px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-[9px] font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500">Available</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
          {(Object.keys(categoryMeta) as ServiceCategory[]).map((cat) => {
            const meta = categoryMeta[cat];
            const Icon = meta.icon;
            return <span key={cat} className="inline-flex items-center gap-1"><Icon size={11} /> {cat}</span>;
          })}
        </div>
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 dark:text-amber-300"><Coffee size={11} /> 02:00–03:00 PM staff break window (sample)</span>
      </div>

      {/* Day records — full booking table with actions */}
      <div className="border-t border-slate-100 dark:border-slate-800">
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
      </div>

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
                <button onClick={() => showToast("WhatsApp message copy ho gaya — real send nahi hua.")} className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#1CA830] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#178e29]">
                  <MessageCircle size={12} /> WhatsApp message copy karein
                </button>
              </div>
              {conflictSlot.alternatives.length > 0 && (
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">In slots mein book kar sakte hain</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {conflictSlot.alternatives.slice(0, 6).map((alt) => (
                      <button key={alt} onClick={() => { setConflictSlot(null); showToast(`${alt} slot select kar liya — booking form mein add karein.`); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Check size={11} /> {alt}
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

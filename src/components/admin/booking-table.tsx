"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, MessageCircle, Pencil, Save, Trash2, X, XCircle } from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { useAuth } from "@/context/auth-context";
import { Booking } from "@/types/salon";
import { waLink, waMessageFor } from "@/lib/whatsapp";
import { SLOT_TIMES, money } from "@/lib/salon-analytics";
import { bookingReference } from "@/lib/booking-schedule";

export const CHANNEL_OPTIONS: { value: Booking["channel"]; label: string }[] = [
  { value: "whatsapp_night", label: "Night WhatsApp" },
  { value: "missed_call", label: "Missed call" },
  { value: "overflow_peak", label: "Peak overflow" },
  { value: "waitlist", label: "Waitlist backfill" },
  { value: "direct", label: "Direct / walk-in" },
];

export const channelLabel = (channel: Booking["channel"]) =>
  CHANNEL_OPTIONS.find((option) => option.value === channel)?.label ?? "Direct";

const STATUS_STYLE: Record<Booking["status"], string> = {
  confirmed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  completed: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  cancelled: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

const btn = "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold transition";
const input =
  "mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

/** Clickable phone number that opens a WhatsApp chat (manual, owner-initiated). */
export function WhatsAppLink({ phone, message, className = "" }: { phone: string; message?: string; className?: string }) {
  const href = waLink(phone, message);
  if (!href) return <span className="text-[10px] text-slate-400">{phone || "Number nahi"}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      title="WhatsApp par chat kholein"
      className={`inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 ${className}`}
    >
      <MessageCircle size={11} /> {phone}
    </a>
  );
}

export default function BookingTable({
  rows,
  compact = false,
  emptyText = "Koi booking nahi mili.",
}: {
  rows: Booking[];
  compact?: boolean;
  emptyText?: string;
}) {
  const { settings, completeBooking, cancelBooking, deleteBooking } = useSalon();
  const { can } = useAuth();
  const canEdit = can("bookings.edit");
  const canDelete = can("bookings.delete");
  const canChangeStatus = can("bookings.status");
  const [editing, setEditing] = useState<Booking | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const cell = compact ? "py-2" : "py-3";

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21]">
        <table className="w-full min-w-[1080px] text-left text-[11px]">
          <thead className="bg-slate-50 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              {["Booking ID", "Client & WhatsApp", "Service", "Stylist", "Date & time", "Channel / source", "Amount", "Status", "Actions"].map((heading) => (
                <th key={heading} className="px-3 py-2.5">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">{emptyText}</td>
              </tr>
            )}
            {rows.map((booking) => {
              const cancelled = booking.status === "cancelled";
              return (
                <tr key={booking.id} className={`transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40 ${cancelled ? "opacity-60" : ""}`}>
                  <td className={`px-3 ${cell} font-mono text-[10px] text-slate-500`}>{bookingReference(booking)}</td>
                  <td className={`px-3 ${cell}`}>
                    <strong className={`block text-[11px] text-slate-800 dark:text-white ${cancelled ? "line-through" : ""}`}>{booking.customerName}</strong>
                    <span className="mt-1 block">
                      <WhatsAppLink phone={booking.customerPhone} message={waMessageFor(booking, settings.name)} />
                    </span>
                  </td>
                  <td className={`max-w-[200px] px-3 ${cell}`}>
                    <span className={`block truncate text-slate-700 dark:text-slate-200 ${cancelled ? "line-through" : ""}`}>{booking.serviceName}</span>
                  </td>
                  <td className={`px-3 ${cell} text-slate-600 dark:text-slate-300`}>{booking.stylistName}</td>
                  <td className={`whitespace-nowrap px-3 ${cell} text-slate-600 dark:text-slate-300`}>
                    <span className="font-semibold">{booking.date}</span> · {booking.time}
                  </td>
                  <td className={`px-3 ${cell}`}>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{channelLabel(booking.channel)}</span>
                  </td>
                  <td className={`whitespace-nowrap px-3 ${cell} font-bold text-emerald-700 dark:text-emerald-400`}>{money(booking.amountPKR)}</td>
                  <td className={`px-3 ${cell}`}>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold capitalize ${STATUS_STYLE[booking.status]}`}>{booking.status}</span>
                  </td>
                  <td className={`px-3 ${cell}`}>
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                      {canChangeStatus && booking.status === "confirmed" && (
                        <>
                          <button onClick={() => completeBooking(booking.id)} className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300`}>
                            <CheckCircle2 size={11} /> Complete
                          </button>
                          <button onClick={() => cancelBooking(booking.id)} className={`${btn} border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300`}>
                            <XCircle size={11} /> Cancel
                          </button>
                        </>
                      )}
                      {canEdit && (
                        <button onClick={() => setEditing(booking)} className={`${btn} border-slate-200 text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-200`}>
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                      {canDelete && (pendingDelete === booking.id ? (
                        <span className="flex items-center gap-1">
                          <button onClick={() => { deleteBooking(booking.id); setPendingDelete(null); }} className={`${btn} border-rose-600 bg-rose-600 text-white`}>Haan, delete</button>
                          <button onClick={() => setPendingDelete(null)} className={`${btn} border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300`}>Nahi</button>
                        </span>
                      ) : (
                        <button onClick={() => setPendingDelete(booking.id)} aria-label="Delete booking" className={`${btn} border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-700 dark:border-slate-700`}>
                          <Trash2 size={11} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <BookingEditor booking={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function BookingEditor({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { settings, updateBooking } = useSalon();
  const [form, setForm] = useState({
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    serviceName: booking.serviceName,
    amount: String(booking.amountPKR),
    stylistName: booking.stylistName,
    date: booking.date,
    time: booking.time,
    channel: booking.channel,
    status: booking.status,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const service = settings.services.find((item) => item.name === form.serviceName);
  const listPrice = service?.pricePKR ?? null;
  const amountNumber = Number(form.amount);
  const customPrice = listPrice !== null && Number.isFinite(amountNumber) && amountNumber !== listPrice;
  const dateOptions = Array.from(new Set(["Today", "Tomorrow", "Saturday", booking.date]));
  const timeOptions = Array.from(new Set([...SLOT_TIMES, booking.time]));

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const save = async () => {
    if (!form.customerName.trim()) {
      setError("Client ka naam zaroori hai.");
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber < 0) {
      setError("Price sahi number mein likhein (0 ya zyada).");
      return;
    }
    setSaving(true);
    const result = await updateBooking(booking.id, {
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      serviceId: service?.id,
      serviceName: form.serviceName,
      amountPKR: amountNumber,
      stylistName: form.stylistName,
      stylistId: settings.stylists.find((stylist) => stylist.name === form.stylistName)?.id,
      date: form.date,
      time: form.time,
      channel: form.channel,
      status: form.status,
      notes: customPrice ? `Custom price ${money(amountNumber)} (service list price ${money(listPrice ?? 0)})` : booking.notes,
    });
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.message ?? "Save nahi hua.");
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-booking-title">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#050d21]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-[.14em] text-emerald-700 dark:text-emerald-400">Booking edit · {bookingReference(booking)}</span>
            <h3 id="edit-booking-title" className="mt-1 text-lg font-bold text-[#052767] dark:text-white">{booking.customerName}</h3>
            <div className="mt-1"><WhatsAppLink phone={form.customerPhone} message={waMessageFor(booking, settings.name)} /></div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17} /></button>
        </div>

        <div className="grid max-h-[68vh] gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Client ka naam
            <input value={form.customerName} onChange={(e) => update("customerName", e.target.value)} className={input} />
          </label>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            WhatsApp number
            <input value={form.customerPhone} onChange={(e) => update("customerPhone", e.target.value)} placeholder="+92 300 0000000" className={input} />
          </label>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
            Service
            <select value={form.serviceName} onChange={(e) => {
              const next = settings.services.find((item) => item.name === e.target.value);
              update("serviceName", e.target.value);
              if (next) update("amount", String(next.pricePKR));
            }} className={input}>
              {!settings.services.some((item) => item.name === booking.serviceName) && <option value={booking.serviceName}>{booking.serviceName}</option>}
              {settings.services.map((item) => <option key={item.id} value={item.name}>{item.name} · {money(item.pricePKR)}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Amount (PKR) — custom price allowed
            <input type="number" min={0} value={form.amount} onChange={(e) => update("amount", e.target.value)} className={input} />
            <span className="mt-1 flex items-center gap-2 text-[10px] font-normal text-slate-500">
              Service list price: {listPrice !== null ? money(listPrice) : "—"}
              {customPrice && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">Custom price</span>}
            </span>
          </label>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Stylist / chair
            <select value={form.stylistName} onChange={(e) => update("stylistName", e.target.value)} className={input}>
              {!settings.stylists.some((stylist) => stylist.name === booking.stylistName) && <option value={booking.stylistName}>{booking.stylistName} (previous staff)</option>}
              {settings.stylists.map((stylist) => <option key={stylist.id} value={stylist.name}>{stylist.name}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Date
            <select value={form.date} onChange={(e) => update("date", e.target.value)} className={input}>
              {dateOptions.map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Time
            <select value={form.time} onChange={(e) => update("time", e.target.value)} className={input}>
              {timeOptions.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Channel / source
            <select value={form.channel} onChange={(e) => update("channel", e.target.value as Booking["channel"])} className={input}>
              {CHANNEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Status
            <select value={form.status} onChange={(e) => update("status", e.target.value as Booking["status"])} className={input}>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-800 sm:col-span-2 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
          <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1CA830] px-4 py-2 text-xs font-bold text-white hover:bg-[#178e29] disabled:opacity-50"><Save size={13} /> {saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

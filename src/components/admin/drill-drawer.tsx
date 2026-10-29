"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Wallet, X, XCircle } from "lucide-react";
import { useSalon } from "@/context/salon-context";
import BookingTable from "@/components/admin/booking-table";
import { DrillSpec, isActive, isToday, money, sumAmount } from "@/lib/salon-analytics";

/** Side panel that shows the live bookings behind any clicked dashboard item. */
export default function DrillDrawer({ spec, onClose }: { spec: DrillSpec; onClose: () => void }) {
  const { bookings } = useSalon();
  const [scope, setScope] = useState<"today" | "all">(spec.defaultToday ? "today" : "all");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = useMemo(() => {
    return bookings
      .filter((booking) => spec.filter(booking))
      .filter((booking) => scope === "all" || isToday(booking))
      .sort((a, b) => {
        const rank = (day: string) => (day === "Today" ? 0 : day === "Tomorrow" ? 1 : 2);
        return rank(a.date) - rank(b.date) || a.time.localeCompare(b.time);
      });
  }, [bookings, spec, scope]);

  const activeRows = rows.filter(isActive);
  const todayCount = bookings.filter((booking) => spec.filter(booking) && isToday(booking)).length;
  const allCount = bookings.filter((booking) => spec.filter(booking)).length;

  return (
    <div className="fixed inset-0 z-[85] flex justify-end bg-slate-950/40 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="drill-title" onClick={onClose}>
      <aside
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-[#050d21]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="min-w-0">
            <span className="text-[9px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">Live drill-down · {spec.subtitle ?? "bookings"}</span>
            <h2 id="drill-title" className="mt-1 truncate text-xl font-extrabold text-[#052767] dark:text-white">{spec.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close panel" className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          {([
            ["today", `Aaj (${todayCount})`],
            ["all", `Sab din (${allCount})`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                scope === value ? "bg-[#052767] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <CalendarDays size={12} /> {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4 dark:bg-slate-800">
          {[
            { label: "Bookings", value: String(rows.length), icon: CalendarDays, tone: "text-[#052767] dark:text-white" },
            { label: "Confirmed", value: String(rows.filter((r) => r.status === "confirmed").length), icon: CheckCircle2, tone: "text-emerald-700 dark:text-emerald-400" },
            { label: "Cancelled", value: String(rows.filter((r) => r.status === "cancelled").length), icon: XCircle, tone: "text-rose-700 dark:text-rose-400" },
            { label: "Value (active)", value: money(sumAmount(activeRows)), icon: Wallet, tone: "text-blue-700 dark:text-blue-300" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="bg-white p-4 dark:bg-[#050d21]">
              <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"><Icon size={11} /> {label}</span>
              <strong className={`mt-1 block text-lg font-extrabold ${tone}`}>{value}</strong>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <BookingTable rows={rows} emptyText={scope === "today" ? "Aaj is item ki koi booking nahi. 'Sab din' dekhein." : "Is item ki koi booking nahi."} />
          <p className="mt-4 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
            Yahan Complete, Cancel, Edit ya Delete karne se overview, chair timeline aur counters foran update hote hain. Phone number par click karke WhatsApp chat khulti hai (owner ki manual action).
          </p>
        </div>
      </aside>
    </div>
  );
}

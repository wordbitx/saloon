"use client";

import React from "react";
import { Armchair, TrendingUp, Wallet, Star, PhoneMissed, MessageCircle, Clock3 } from "lucide-react";
import { useSalon } from "@/context/salon-context";

export default function StylistWorkload() {
  const { settings, bookings, repeatCustomers } = useSalon();

  const todayBookings = bookings.filter((b) => b.date === "Today" && b.status !== "cancelled");
  const totalRevenue = todayBookings.reduce((sum, b) => sum + b.amountPKR, 0);

  const rows = settings.stylists.map((stylist) => {
    const assigned = todayBookings.filter((b) => b.stylistName === stylist.name);
    const revenue = assigned.reduce((sum, b) => sum + b.amountPKR, 0);
    const loyalClients = repeatCustomers.filter((c) => c.preferredStylist === stylist.name).length;
    const missedCallWins = assigned.filter((b) => b.channel === "missed_call").length;
    const share = totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0;
    return { ...stylist, assigned: assigned.length, revenue, loyalClients, missedCallWins, share };
  }).sort((a, b) => b.revenue - a.revenue);

  const maxAssigned = Math.max(1, ...rows.map((r) => r.assigned));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-[.15em] text-blue-700 dark:text-blue-300">Stylist performance · aaj</span>
          <h3 className="mt-1 text-base font-bold text-[#052767] dark:text-white">Kaunsi stylist ki chair zyada bhari hai</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Bookings, revenue share aur loyal clients per stylist.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">SAMPLE</span>
      </div>

      <div className="mt-4 space-y-3.5">
        {rows.map((stylist) => (
          <div key={stylist.id}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {stylist.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <strong className="block truncate text-slate-800 dark:text-white">{stylist.name}</strong>
                  <span className="block truncate text-[9px] text-slate-400">{stylist.specialty}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold">
                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300"><Armchair size={11} /> {stylist.assigned}</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><Wallet size={11} /> PKR {stylist.revenue.toLocaleString("en-PK")}</span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1CA830] to-[#052767] transition-all duration-500"
                style={{ width: `${(stylist.assigned / maxAssigned) * 100}%` }}
              />
            </div>
            <div className="mt-1 flex items-center gap-3 text-[9px] font-semibold text-slate-400">
              <span className="inline-flex items-center gap-1"><Star size={10} className="text-amber-500" /> {stylist.loyalClients} loyal clients</span>
              <span className="inline-flex items-center gap-1"><PhoneMissed size={10} className="text-amber-500" /> {stylist.missedCallWins} call wins</span>
              <span className="inline-flex items-center gap-1"><TrendingUp size={10} className="text-blue-500" /> {stylist.share}% revenue share</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

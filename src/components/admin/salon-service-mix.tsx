"use client";

import React from "react";
import { Scissors, Sparkles, Brush, Droplets, TrendingUp, ArrowUpRight } from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { useWorkspaces } from "@/context/workspace-context";
import { ServiceCategory } from "@/types/salon";

const categoryMeta: Record<ServiceCategory, { icon: typeof Scissors; bar: string; tint: string }> = {
  Hair: { icon: Scissors, bar: "bg-blue-600", tint: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  "Skin & Facial": { icon: Sparkles, bar: "bg-emerald-600", tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  "Makeup & Bridal": { icon: Brush, bar: "bg-rose-600", tint: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
  Nails: { icon: Droplets, bar: "bg-violet-600", tint: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" },
};

export default function SalonServiceMix() {
  const { settings, bookings } = useSalon();
  const { activeWorkspace } = useWorkspaces();

  const active = bookings.filter((b) => b.status !== "cancelled");

  const mix = (Object.keys(categoryMeta) as ServiceCategory[]).map((category) => {
    const services = settings.services.filter((s) => s.category === category);
    const categoryBookings = active.filter((b) =>
      services.some((s) => s.name === b.serviceName)
    );
    const revenue = categoryBookings.reduce((sum, b) => sum + b.amountPKR, 0);
    const recovered = categoryBookings.filter((b) => b.isRecovered).length;
    return { category, services: services.length, bookings: categoryBookings.length, revenue, recovered };
  });

  const maxRevenue = Math.max(1, ...mix.map((m) => m.revenue));
  const totalRevenue = mix.reduce((sum, m) => sum + m.revenue, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-[.15em] text-rose-700 dark:text-rose-300">Salon menu mix</span>
          <h3 className="mt-1 text-base font-bold text-[#052767] dark:text-white"> kis category ki demand zyada hai</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Service categories ke hisaab se bookings aur revenue.</p>
        </div>
        <span className="rounded-full bg-rose-50 px-2 py-1 text-[9px] font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">{activeWorkspace.isSample ? "SAMPLE" : "SELECTED SALON"}</span>
      </div>

      <div className="mt-4 space-y-3.5">
        {mix.map((item) => {
          const meta = categoryMeta[item.category];
          const Icon = meta.icon;
          const share = totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0;
          return (
            <div key={item.category}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold ${meta.tint}`}>
                  <Icon size={12} /> {item.category}
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {item.bookings} bookings · PKR {item.revenue.toLocaleString("en-PK")} · {share}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${meta.bar} transition-all duration-500`}
                  style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                />
              </div>
              <div className="mt-1 flex items-center gap-3 text-[9px] font-semibold text-slate-400">
                <span>{item.services} services</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><TrendingUp size={10} /> {item.recovered} recovered</span>
                <span className="inline-flex items-center gap-1 text-blue-500"><ArrowUpRight size={10} /> {share}% of revenue</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

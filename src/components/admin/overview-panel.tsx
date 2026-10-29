"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight, Banknote, CalendarDays, Clock3, Download, Gift, Inbox, MapPin, Plus, Sparkles, UserPlus, Wallet } from "lucide-react";
import { useSalon } from "@/context/salon-context";
import SalonChairTimeline from "@/components/admin/salon-chair-timeline";
import StylistWorkload from "@/components/admin/stylist-workload";
import SalonServiceMix from "@/components/admin/salon-service-mix";
import {
  CATEGORY_LABEL,
  DrillSpec,
  categoryForBooking,
  categorySummary,
  isActive,
  isToday,
  money,
  overviewMetrics,
  sumAmount,
} from "@/lib/salon-analytics";

type InboxItem = { id: string; name: string; time: string; message: string; channel: string };

type Props = {
  onDrill: (spec: DrillSpec) => void;
  onNavigate: (section: string) => void;
  onAddBooking: () => void;
  onWalkIn: () => void;
  onExportCsv: () => void;
  inbox: InboxItem[];
  inboxPending: number;
};

function SectionHead({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <span className="text-[9px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">{eyebrow}</span>
        <h2 className="mt-1 text-sm font-bold text-[#052767] dark:text-white">{title}</h2>
      </div>
      {hint && <span className="text-[10px] text-slate-500 dark:text-slate-400">{hint}</span>}
    </div>
  );
}

export default function OverviewPanel({ onDrill, onNavigate, onAddBooking, onWalkIn, onExportCsv, inbox, inboxPending }: Props) {
  const { settings, bookings, waitlist } = useSalon();
  const metrics = overviewMetrics(bookings, waitlist);
  const categories = categorySummary(bookings, settings);
  const todayRows = bookings.filter((booking) => isActive(booking) && isToday(booking));

  const todayRecoveredSpec: DrillSpec = {
    title: "Aaj recover hui bookings",
    subtitle: "Missed WhatsApp, missed call aur overflow se aayi (aaj)",
    defaultToday: true,
    filter: (booking) => isActive(booking) && isToday(booking) && booking.isRecovered,
  };
  const confirmedTodaySpec: DrillSpec = {
    title: "Aaj ki confirmed bookings",
    subtitle: "Aaj ke confirmed appointments",
    defaultToday: true,
    filter: (booking) => isActive(booking) && isToday(booking) && booking.status === "confirmed",
  };
  const recoveredAllSpec: DrillSpec = {
    title: "Sab bachi hui bookings",
    subtitle: "Har din ki recovered bookings",
    defaultToday: false,
    filter: (booking) => isActive(booking) && booking.isRecovered,
  };

  return (
    <div className="space-y-5">
      {/* Hero — live headline and stat tiles */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-lg shadow-blue-950/10 dark:border-slate-800">
        <Image src="/images/salon-interior-hero.jpg" alt="Fictional Glow Salon interior (sample imagery)" fill priority sizes="(max-width: 1024px) 100vw, 1100px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#031844]/93 via-[#052767]/78 to-[#052767]/30" />
        <div className="relative z-10 grid gap-6 p-5 text-white sm:p-6 lg:grid-cols-[1fr_300px] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.14em] text-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Open · {settings.openingTime} – {settings.closingTime}
              </span>
              <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[9px] font-bold text-white">Fictional demo salon</span>
            </div>

            <button onClick={() => onDrill(todayRecoveredSpec)} className="group mt-3 block text-left">
              <h2 className="text-xl font-extrabold leading-snug tracking-tight text-white sm:text-2xl">
                Aaj{" "}
                <span className="rounded-md text-emerald-300 underline decoration-emerald-300/60 decoration-dotted underline-offset-4 group-hover:text-emerald-200">
                  {metrics.todayRecoveredCount} bookings
                </span>{" "}
                bach gayi — {money(metrics.todayRecoveredValue)}
              </h2>
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-200/90">Dekhne ke liye click karein <ArrowRight size={11} /></span>
            </button>

            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-white/90"><MapPin size={12} /> {settings.name} · {settings.area}</p>
            <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-white/85">
              Missed WhatsApp messages, missed calls aur cancellations se bachi hui bookings. Neeche category, chair aur booking details sab live hain.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={onWalkIn} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-[#052767] hover:bg-blue-50"><UserPlus size={11} /> Walk-in add karein</button>
              <button onClick={onAddBooking} className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-[10px] font-bold text-white hover:bg-white/20"><Plus size={11} /> Naya slot / booking</button>
              <button onClick={onExportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/50 bg-emerald-500/20 px-3 py-2 text-[10px] font-bold text-white hover:bg-emerald-500/30"><Download size={11} /> CSV export</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Chairs (stylists)", value: settings.stylists.length, onClick: () => onNavigate("staff") },
              { label: "Confirmed today", value: metrics.todayConfirmed, onClick: () => onDrill(confirmedTodaySpec) },
              { label: "Waitlist waiting", value: metrics.waitingCount, onClick: () => onNavigate("waitlist") },
              { label: "Menu services", value: settings.services.length, onClick: () => onNavigate("services") },
            ].map((tile) => (
              <button key={tile.label} onClick={tile.onClick} className="group rounded-xl border border-white/25 bg-white/15 p-3 text-left backdrop-blur-sm transition hover:bg-white/25">
                <strong className="block text-xl font-extrabold text-white">{tile.value}</strong>
                <span className="mt-0.5 flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider text-white/85">
                  {tile.label} <ArrowRight size={10} className="opacity-0 transition group-hover:opacity-100" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Category cards — today's bookings per category, live */}
      <section className="space-y-3">
        <SectionHead eyebrow="Category-wise aaj" title="Category par click karein — us ki bookings khul jayengi" hint={`${todayRows.length} active bookings aaj`} />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {categories.map((entry) => (
            <button
              key={entry.category}
              onClick={() => onDrill({
                title: entry.label,
                subtitle: `${entry.category} · aaj ki bookings`,
                defaultToday: true,
                filter: (booking) => isActive(booking) && categoryForBooking(booking, settings) === entry.category,
              })}
              className="group relative h-40 overflow-hidden rounded-xl border border-slate-200 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800"
            >
              <Image src={entry.image} alt={CATEGORY_LABEL[entry.category]} fill sizes="(max-width: 640px) 50vw, 300px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#031844]/92 via-[#031844]/35 to-transparent" />
              <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold text-[#052767]">{entry.count}</span>
              <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                <strong className="block text-xs font-bold">{entry.label}</strong>
                <span className="block text-[10px] font-semibold text-white/90">{entry.count} aaj ki {entry.count === 1 ? "booking" : "bookings"}</span>
                <span className="block text-[10px] text-emerald-200">{money(entry.revenue)} · {entry.category}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* KPI row — every card opens its own list */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Total bachi hui (sab din)", value: String(metrics.recoveredCount), help: "Recovered bookings · click = list", icon: CalendarDays, tone: "emerald", onClick: () => onDrill(recoveredAllSpec) },
          { label: "Recovered value (sab din)", value: money(metrics.recoveredValue), help: "Salon register mein aaya paisa", icon: Wallet, tone: "blue", onClick: () => onDrill(recoveredAllSpec) },
          { label: "Waitlist slot backfill", value: String(metrics.waitingCount), help: "Khaali chair ka intezar", icon: Clock3, tone: "violet", onClick: () => onNavigate("waitlist") },
          { label: "Enquiries pending", value: String(inboxPending), help: "Owner ka jawab baqi", icon: Inbox, tone: "amber", onClick: () => onNavigate("inbox") },
        ].map(({ label, value, help, icon: Icon, tone, onClick }) => (
          <button key={label} onClick={onClick} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-[#050d21]">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              tone === "emerald" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : tone === "blue" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              : tone === "violet" ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}><Icon size={17} /></span>
            <strong className="mt-3 block text-xl font-extrabold text-[#052767] dark:text-white">{value}</strong>
            <span className="mt-1 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">{label} <ArrowRight size={12} className="opacity-0 transition group-hover:opacity-100" /></span>
            <span className="mt-0.5 block text-[10px] text-slate-400">{help}</span>
          </button>
        ))}
      </div>

      {/* Chair timeline — live, with day tabs and records */}
      <SalonChairTimeline onAddBooking={onAddBooking} onOpenDrill={onDrill} />

      {/* Salon menu — every service is clickable */}
      <section className="space-y-3">
        <SectionHead eyebrow="Salon menu · live" title="Service par click karein — us service ki sab bookings" hint="Aaj / total bookings aur revenue" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {settings.services.map((service) => {
            const all = bookings.filter((booking) => isActive(booking) && booking.serviceName === service.name);
            const today = all.filter(isToday);
            return (
              <button
                key={service.id}
                onClick={() => onDrill({
                  title: service.name,
                  subtitle: `${service.category} · ${money(service.pricePKR)} · ${service.durationMinutes} min`,
                  defaultToday: false,
                  filter: (booking) => booking.serviceName === service.name,
                })}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-[#050d21]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Sparkles size={14} /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[11px] text-slate-800 dark:text-slate-100">{service.name}</strong>
                  <span className="block text-[9px] text-slate-400">{service.category} · {service.durationMinutes} min · {money(service.pricePKR)}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5 text-[9px] font-bold">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{today.length} aaj</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{all.length} total</span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{money(sumAmount(all))}</span>
                  </span>
                </span>
                <ArrowRight size={13} className="mt-1 shrink-0 text-slate-300 transition group-hover:text-emerald-600" />
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <StylistWorkload />
        <SalonServiceMix />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
        {/* Today's clients — each row opens that booking */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21]">
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Aaj ke clients</span>
              <h3 className="mt-1 text-sm font-bold text-[#052767] dark:text-white">Floor par abhi ki list</h3>
            </div>
            <button onClick={() => onNavigate("bookings")} className="text-[10px] font-bold text-emerald-700 hover:underline dark:text-emerald-400">Poori register →</button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {todayRows.slice(0, 6).map((booking) => (
              <button
                key={booking.id}
                onClick={() => onDrill({ title: booking.customerName, subtitle: `${booking.serviceName} · ${booking.date} ${booking.time}`, defaultToday: false, filter: (row) => row.id === booking.id })}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
              >
                <span className="w-16 shrink-0 text-[10px] font-bold text-slate-500">{booking.time}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{booking.customerName.slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs text-slate-800 dark:text-slate-100">{booking.customerName}</strong>
                  <span className="block truncate text-[10px] text-slate-500">{booking.serviceName} · {booking.stylistName}</span>
                </span>
                <span className="hidden text-[10px] font-semibold text-emerald-700 sm:block dark:text-emerald-400">{money(booking.amountPKR)}</span>
              </button>
            ))}
            {todayRows.length === 0 && <div className="p-8 text-center text-xs text-slate-400">Aaj koi confirmed booking nahi — waitlist se slot bharein.</div>}
          </div>
        </section>

        {/* Owner attention */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-300">Owner attention</span>
              <h3 className="mt-1 text-sm font-bold text-[#052767] dark:text-white">Inbox mein jawab baqi</h3>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">{inboxPending} pending</span>
          </div>
          <div className="mt-3 space-y-2">
            {inbox.slice(0, 3).map((item) => (
              <button key={item.id} onClick={() => onNavigate("inbox")} className="w-full rounded-xl border border-slate-100 p-3 text-left transition hover:border-emerald-300 dark:border-slate-800">
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-[11px] text-slate-800 dark:text-slate-100">{item.name}</strong>
                  <span className="shrink-0 text-[9px] text-slate-400">{item.time}</span>
                </span>
                <span className="mt-1 block line-clamp-2 text-[10px] text-slate-500">{item.message}</span>
              </button>
            ))}
          </div>
          <button onClick={() => onNavigate("waitlist")} className="mt-3 w-full rounded-lg bg-slate-50 py-2 text-[10px] font-bold text-[#052767] hover:bg-emerald-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-emerald-950/40">Waitlist se slot bharein</button>
        </section>
      </div>

      {/* Quick actions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Quick actions</span>
            <h3 className="mt-1 text-sm font-bold text-[#052767] dark:text-white">Roz ke salon kaam</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onWalkIn} className="rounded-lg bg-[#1CA830] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#178e29]"><UserPlus className="mr-1 inline" size={13} /> Walk-in</button>
            <button onClick={onAddBooking} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-200"><Plus className="mr-1 inline" size={13} /> Naya booking</button>
            <button onClick={() => onNavigate("waitlist")} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"><Gift className="mr-1 inline" size={13} /> Waitlist</button>
            <a href="/simulator" className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">WhatsApp simulator</a>
            <button onClick={() => onNavigate("reports")} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Reports</button>
          </div>
        </div>
      </section>
    </div>
  );
}

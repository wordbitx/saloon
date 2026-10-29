"use client";

import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Gift,
  HelpCircle,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  PhoneMissed,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { WORDBITX_COMPANY } from "@/lib/constants";

export default function HomeView() {
  const {
    setActiveTab,
    recoveredCount,
    recoveredRevenuePKR,
    openConsultationWithPlan,
  } = useSalon();

  const comparisonRows = [
    {
      feature: "Night & Off-Hour Inquiries (11 PM - 8 AM)",
      freeApp: "Away message template (no booking lock)",
      receptionist: "Unavailable (salon closed / sleeping)",
      wordbitx: "24/7 Roman Urdu booking flow & slot lock",
      highlight: true,
    },
    {
      feature: "Missed Phone Calls Outreach",
      freeApp: "None (Calls not linked to WhatsApp)",
      receptionist: "Manual callback if time permits",
      wordbitx: "Auto-WhatsApp sent within 4 seconds",
      highlight: true,
    },
    {
      feature: "Cancellation Waitlist Backfilling",
      freeApp: "None (Manual human texting)",
      receptionist: "Often chair stays empty",
      wordbitx: "Instant WhatsApp offer to waitlist client #1",
      highlight: true,
    },
    {
      feature: "Stylist Loyalty Preference Routing",
      freeApp: "No context / customer typing freely",
      receptionist: "Manual diary check",
      wordbitx: "'Hina se hi chahiye' stylist slot routing",
      highlight: false,
    },
    {
      feature: "Repeat Customer Recognition",
      freeApp: "Generic greeting template",
      receptionist: "Depends on receptionist memory",
      wordbitx: "'Walaikum Assalam Ayesha! Last time balayage...'",
      highlight: true,
    },
    {
      feature: "Google Review Link After Service",
      freeApp: "None",
      receptionist: "Rarely remembered during rush",
      wordbitx: "Automated 1-click WhatsApp review link",
      highlight: false,
    },
    {
      feature: "Owner Recovery Report ('Kitni Booking Bachi')",
      freeApp: "Zero reports / invisible leakage",
      receptionist: "Paper diary or verbal estimate",
      wordbitx: "Daily snapshot + CSV export + Subah ki brief",
      highlight: true,
    },
  ];

  const leaks = [
    {
      icon: Clock3,
      title: "1. Night WhatsApp Inquiries",
      time: "11:00 PM – 08:00 AM",
      desc: "Customer bistar mein late-night Instagram scroll karti hai aur WhatsApp karti hai. Subah 11 baje tak reply na aye to doosre salon chali jati hai.",
      solution: "WordbitX: Raat ko foran booking slot lock karta hai.",
      tone: "amber",
    },
    {
      icon: Users,
      title: "2. Peak Hour Drop-off",
      time: "03:00 PM – 07:00 PM",
      desc: "Front desk par client khara hai, phone ring ho raha hai, aur 3 WhatsApp messages pending hain. Ek waqt mein aik hi attend hota hai.",
      solution: "WordbitX: Receptionist ka overflow pakar kar queue clear karta hai.",
      tone: "blue",
    },
    {
      icon: PhoneMissed,
      title: "3. Missed Calls",
      time: "Daily Rush Hours",
      desc: "Blowdryer aur salon music ke shor mein phone ring miss ho jati hai. 73% clients dobara dial nahi karte.",
      solution: "WordbitX: Call miss hote hi 4s mein WhatsApp bhejta hai.",
      tone: "rose",
    },
    {
      icon: CalendarDays,
      title: "4. Last-Minute Cancellations",
      time: "Same Day Slots",
      desc: "Customer aane se 2 ghante pehle cancel karti hai. Chair khaali reh jati hai aur salon ka PKR 15,000 ka slot zaya hota hai.",
      solution: "WordbitX: Waitlist customer ko 3 min mein slot offer karta hai.",
      tone: "emerald",
    },
  ];

  const lahoreAreas = [
    "DHA Phase 5",
    "Gulberg III",
    "Model Town",
    "Johar Town",
    "Cantt",
    "Bahria Town",
  ];

  return (
    <div className="space-y-16 pb-12 animate-in fade-in duration-200">
      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Subtle radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-96 bg-gradient-to-b from-[#1CA830]/10 via-[#052767]/5 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 via-[#052767]/10 to-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-[#052767] dark:text-[#9fdda8] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#1CA830] animate-pulse" />
            <span className="font-bold text-[#1CA830]">WordbitX</span>
            <span className="text-slate-400">·</span>
            <span>Software Development Company, Lahore</span>
            <span className="hidden sm:inline text-slate-400">·</span>
            <span className="hidden sm:inline text-emerald-700 dark:text-emerald-300 font-mono">
              24h Setup SLA
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#052767] dark:text-white leading-[1.12]">
            Har Missed Message Ko{" "}
            <span className="bg-gradient-to-r from-[#1CA830] via-[#158a28] to-[#052767] bg-clip-text text-transparent">
              Bachi Hui Booking
            </span>{" "}
            Banayein.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Salon ke har missed WhatsApp message aur missed call par foran jawab, booking offer,
            reminder, aur cancellation par waitlist backfill. Owner ko roz aik list:{" "}
            <strong className="text-[#052767] dark:text-white">
              &ldquo;Aaj kitni booking bachi.&rdquo;
            </strong>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <button
              onClick={() => setActiveTab("simulator")}
              className="px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#1CA830] hover:bg-[#178e29] shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Live WhatsApp Simulator Chala Kar Dekhein</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab("dashboard")}
              className="px-5 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-[#052767] dark:text-white bg-white dark:bg-[#050d21] border border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-xs flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-[#1CA830]" />
              <span>Owner Dashboard (&ldquo;Kitni Booking Bachi&rdquo;)</span>
            </button>
          </div>

          <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1CA830]" />
            <span>
              Phase 1 sellable demo · Fictional &ldquo;Glow Salon, Lahore&rdquo; · Labelled Sample Data
            </span>
          </div>
        </div>

        {/* Live Metrics Proof Bar */}
        <div className="mt-12 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#050d21] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="p-3 text-center border-r border-slate-100 dark:border-slate-800 last:border-0">
            <div className="text-xl sm:text-3xl font-extrabold text-[#1CA830] tracking-tight">
              {recoveredCount} Bookings
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Recovered from Leak (Sample)
            </div>
          </div>
          <div className="p-3 text-center border-r border-slate-100 dark:border-slate-800 last:border-0">
            <div className="text-xl sm:text-3xl font-extrabold text-[#052767] dark:text-white tracking-tight">
              PKR {recoveredRevenuePKR.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Protected Revenue
            </div>
          </div>
          <div className="p-3 text-center border-r border-slate-100 dark:border-slate-800 last:border-0">
            <div className="text-xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              &lt; 4 Seconds
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Missed Call → WhatsApp Outreach
            </div>
          </div>
          <div className="p-3 text-center">
            <div className="text-xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
              24 Ghante
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              WordbitX Setup SLA
            </div>
          </div>
        </div>
      </section>

      {/* Salon gallery — what the recovered salon floor looks like */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles size={13} /> Salon floor preview
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#052767] dark:text-white leading-tight">
              Woh chair jis par customer <span className="gradient-text">khud book</span> hoti hai.
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              WordbitX ke saath salon ka floor aik controlled system ban jata hai: har chair ka schedule,
              har stylist ki load, har service ka rate — aur har khali slot bharne ke liye ready waitlist.
            </p>
            <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-200">
              {[
                "Chair-by-chair schedule, stylist ke hisaab se",
                "Har service ka exact PKR rate aur duration",
                "Empty slot → waitlist guest ko 3 minute mein offer",
                "Client ki apni preferred stylist ke saath booking",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#1CA830] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => setActiveTab("dashboard")} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#052767] px-5 py-3 text-xs font-bold text-white hover:bg-[#0a3582] transition-colors">
              <LayoutDashboard size={16} /> Dashboard mein chair timeline dekhein
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-4 grid-rows-3 gap-3 sm:gap-4 h-[380px] sm:h-[440px]">
              <figure className="col-span-2 row-span-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/salon-interior-hero.jpg" alt="Modern Lahore salon interior with styling chairs and mirrors" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
              </figure>
              <figure className="col-span-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/salon-hair-stylist.jpg" alt="Salon stylist performing a balayage colour service" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
              </figure>
              <figure className="col-span-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/salon-bridal-makeup.jpg" alt="Bridal makeup being applied in a salon dressing room" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
              </figure>
              <figure className="col-span-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/salon-facial-treatment.jpg" alt="Client receiving a facial treatment in a salon treatment room" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
              </figure>
              <div className="col-span-2 row-span-1 rounded-2xl bg-[#052767] text-white p-4 flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">SAMPLE SALON</span>
                <strong className="mt-1 text-base font-extrabold">Glow Salon, Lahore</strong>
                <span className="mt-1 text-[11px] text-blue-100/80 leading-relaxed">DHA Phase 5 · Gulberg III · Johar Town</span>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-400">
              Sample imagery for the fictional Glow Salon demo — no real salon photographs are used.
            </p>
          </div>
        </div>
      </section>

      {/* The 4 Leaks in Lahore Salons */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
          <div className="text-xs font-semibold text-[#1CA830] uppercase tracking-wider">
            Pitch Growth Nahi, Recovery Hai
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#052767] dark:text-white">
            Receptionist ko replace nahi — us ka overflow pakarta hai
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Receptionist bohot mehnti hai, lekin insan ki hudood hain. WordbitX un 4 jagaon ko seal
            karta hai jahan se appointments leak hoti hain:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {leaks.map((leak, idx) => {
            const Icon = leak.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-[#050d21] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#1CA830]/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#071531] text-[#1CA830] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {leak.time}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#052767] dark:text-white">
                      {leak.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {leak.desc}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-[#1CA830]">
                  {leak.solution}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Matrix Table */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#050d21] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <span className="text-xs font-bold text-[#1CA830] uppercase tracking-wider block mb-1">
                Capability Matrix
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#052767] dark:text-white">
                Free WhatsApp App vs. Receptionist vs. WordbitX
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Meta ka Cloud API sirf rasta (pipe) hai — dimagh us ke upar banana parta hai. Dimagh +
              setup + maintenance hi yeh product hai.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="py-3 px-3">Capability / Feature</th>
                  <th className="py-3 px-3 text-slate-500">Free WhatsApp App</th>
                  <th className="py-3 px-3 text-slate-500">Receptionist Alone</th>
                  <th className="py-3 px-3 text-[#1CA830]">WordbitX Recovery Engine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {comparisonRows.map((row, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors ${
                      row.highlight ? "bg-emerald-500/[0.02]" : ""
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-[#052767] dark:text-white">
                      {row.feature}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{row.freeApp}</td>
                    <td className="py-3 px-3 text-slate-500">{row.receptionist}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-700 dark:text-[#9fdda8]">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#1CA830] shrink-0" />
                        <span>{row.wordbitx}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Lahore Salons Niche Focus */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[#052767] via-[#071531] to-[#021233] text-white space-y-6 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl space-y-3 relative z-10">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 uppercase tracking-wider">
              Pehla Buyer — Sirf Yehi
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">
              ONLY Salons in Lahore, Pakistan Pehle.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Na clinics, na restaurants, na &ldquo;all businesses&rdquo;. Wajah: booking hi salon ka
              business hai, owner khud faisla karta hai, raat ke messages aam hain, demo visual hai.
              Doosri niche sirf 5 paying salons ke BAAD.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs font-semibold">
              {lahoreAreas.map((area) => (
                <span
                  key={area}
                  className="px-3 py-1 rounded-lg bg-white/10 text-emerald-300 border border-white/10 flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#1CA830]" />
                  <span>{area}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WordbitX Company Credibility */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 rounded-3xl bg-white dark:bg-[#050d21] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1CA830] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>WordbitX Engineering Credibility</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#052767] dark:text-white">
              WordbitX — Software Development Company, Lahore.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              WordbitX agency nahi hai, freelancer nahi hai — aik registered software company aur brand
              hai. Product ko dekh kar, istemal kar ke, aur service se client ko yeh farq mehsoos
              hota hai ke yeh aik company ka product hai: poori team wali support, 24 ghante mein
              setup, monthly audit, proper dashboard — na ke &ldquo;aik banda&rdquo; wali feeling.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1CA830]" />
                <span>24 Ghante Mein Setup SLA</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1CA830]" />
                <span>Monthly Verified Audit</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1CA830]" />
                <span>Supabase PostgreSQL RLS</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1CA830]" />
                <span>Official Meta Cloud API</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#071531] border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="font-bold text-[#052767] dark:text-white text-sm">
              Official Head Office & Direct Lines
            </div>
            <div className="space-y-2 text-slate-600 dark:text-slate-300">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1CA830] shrink-0" />
                <span>{WORDBITX_COMPANY.headquarters}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#1CA830] shrink-0" />
                <a href={`mailto:${WORDBITX_COMPANY.email}`} className="text-[#1CA830] font-bold hover:underline">
                  {WORDBITX_COMPANY.email}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#1CA830] shrink-0" />
                <span>PK: {WORDBITX_COMPANY.phonePK}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#1CA830] shrink-0" />
                <span>USA: {WORDBITX_COMPANY.phoneUSA}</span>
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-slate-500">{WORDBITX_COMPANY.website}</span>
              <button
                onClick={() => openConsultationWithPlan("Growth Plan (Most Popular)")}
                className="text-[#1CA830] font-bold hover:underline flex items-center gap-1"
              >
                <span>Book Setup Consultation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

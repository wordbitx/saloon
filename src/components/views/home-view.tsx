"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  MessageCircle,
  PhoneMissed,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import HomePhoneDemo from "@/components/demo/home-phone-demo";
import ProductShowcase from "@/components/shop/product-showcase";
import { useSalon } from "@/context/salon-context";
import { isActive, overviewMetrics } from "@/lib/salon-analytics";

const leaks = [
  {
    time: "11:00 PM – 08:00 AM",
    title: "1. Night WhatsApp Inquiries",
    description: "Customer late-night Instagram scroll karti hai aur WhatsApp karti hai. Subah tak reply na aaye to woh doosre salon chali ja sakti hai.",
    solution: "WordbitX: Raat ke sawal ka jawab aur booking ka flow.",
  },
  {
    time: "03:00 PM – 07:00 PM",
    title: "2. Peak Hour Drop-off",
    description: "Front desk par client khara hai, phone ring ho raha hai, aur WhatsApp messages pending hain. Ek waqt mein aik hi attend hota hai.",
    solution: "WordbitX: Receptionist ka overflow sambhalne mein madad.",
  },
  {
    time: "Daily Rush Hours",
    title: "3. Missed Calls",
    description: "Blowdryer aur salon music ke shor mein phone ring miss ho jati hai. Har client dobara call nahi karta.",
    solution: "WordbitX: Missed call ke baad WhatsApp follow-up ka demo.",
  },
  {
    time: "Same Day Slots",
    title: "4. Last-Minute Cancellations",
    description: "Customer aane se pehle cancel karti hai. Chair khaali reh jati hai aur us waqt ki booking zaya ho sakti hai.",
    solution: "WordbitX: Khaali slot waitlist guest ko offer karne ka flow.",
  },
];

const comparisonRows = [
  { feature: "Raat ke inquiries", freeApp: "Away message", receptionist: "Salon band hota hai", wordbitx: "Booking conversation ka demo" },
  { feature: "Missed phone calls", freeApp: "WhatsApp se linked nahi", receptionist: "Waqt mile to callback", wordbitx: "WhatsApp follow-up ka demo" },
  { feature: "Cancellation waitlist", freeApp: "Manual messages", receptionist: "Khud slot offer karna", wordbitx: "Waitlist aur slot offer flow" },
  { feature: "Preferred stylist", freeApp: "Customer ko batana hota hai", receptionist: "Diary check", wordbitx: "Stylist preference ke saath booking" },
  { feature: "Repeat customers", freeApp: "Generic greeting", receptionist: "Yaad ya notes par depend", wordbitx: "Sample customer history" },
  { feature: "Owner recovery report", freeApp: "Recovery report nahi", receptionist: "Paper diary ya estimate", wordbitx: "Dashboard, snapshot aur CSV" },
];

const formatShortAmount = (amount: number) =>
  amount >= 1000 ? `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k` : String(amount);

export default function HomeView() {
  const { bookings, waitlist, openConsultationWithPlan } = useSalon();
  const metrics = overviewMetrics(bookings, waitlist);
  const recentBookings = bookings.filter((booking) => isActive(booking) && booking.isRecovered).slice(0, 4);

  return (
    <div className="overflow-hidden bg-[#f8fafc] dark:bg-[#030814]">
      {/* Hero: one animated example, not a second copy further down the page. */}
      <section className="relative border-b border-slate-200/80 dark:border-[#14213a]">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[70%] -translate-x-1/2 rounded-full bg-emerald-400/[0.04] blur-[110px] dark:bg-emerald-500/[0.035]" />
        <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-5 pb-12 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:gap-16 lg:pb-16 lg:pt-16">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-emerald-600/15 bg-emerald-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.08em] text-emerald-800 sm:text-[11px] dark:border-emerald-500/20 dark:bg-[#0c2d20] dark:text-[#79db87]">
                WordbitX · 24h setup SLA · Lahore
              </span>
              <span className="rounded-md border border-dashed border-emerald-600/50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.08em] text-emerald-700 dark:text-[#79db87]">Sample data</span>
            </div>

            <h1 className="mt-5 max-w-[680px] text-[clamp(2.65rem,4.2vw,3.75rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-[#09265d] dark:text-[#f2f5ff]">
              Missed message ab <span className="block text-[#159a36] dark:text-[#67d178]">booking banega.</span>
            </h1>
            <p className="mt-6 max-w-[610px] text-[15px] leading-[1.8] text-slate-600 sm:text-base dark:text-[#a3b0c8]">
              Salon ke har missed WhatsApp message aur missed call par <strong className="font-bold text-slate-800 dark:text-slate-100">foran jawab</strong>, booking offer, reminder — aur cancellation par <strong className="font-bold text-slate-800 dark:text-slate-100">waitlist backfill</strong>. Owner ko roz aik list: <strong className="font-bold text-emerald-700 dark:text-[#a3dfad]">&ldquo;Aaj kitni booking bachi.&rdquo;</strong>
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/simulator" className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-[#1ca830] px-5 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#168d2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500">
                <Play size={16} /> Demo chat try karein <ArrowRight size={15} />
              </Link>
              <Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-[#102a50] transition hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:border-[#1a2b4b] dark:bg-[#050d1f] dark:text-slate-100 dark:hover:border-emerald-700 dark:hover:bg-[#0b1a30]">
                <LayoutDashboard size={16} /> Owner dashboard
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-[#8797b3]">
              Phase 1 demo · Fictional salon · Sample data, no real messages sent
            </p>

            <div className="mt-8 grid max-w-[560px] grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#17294b] dark:bg-[#071228]">
              <div className="min-w-0 px-3 py-4 sm:px-5">
                <strong className="block text-xl font-extrabold tracking-tight text-emerald-700 sm:text-2xl dark:text-[#69d279]">{metrics.todayRecoveredCount}</strong>
                <span className="mt-1 block text-[10px] font-medium leading-tight text-slate-500 sm:text-[11px] dark:text-[#9aabc4]">Recovered today</span>
              </div>
              <div className="min-w-0 border-x border-slate-200 px-3 py-4 sm:px-5 dark:border-[#17294b]">
                <strong className="block text-xl font-extrabold tracking-tight text-emerald-700 sm:text-2xl dark:text-[#69d279]">PKR {formatShortAmount(metrics.todayRecoveredValue)}</strong>
                <span className="mt-1 block text-[10px] font-medium leading-tight text-slate-500 sm:text-[11px] dark:text-[#9aabc4]">Protected revenue</span>
              </div>
              <div className="min-w-0 px-3 py-4 sm:px-5">
                <strong className="block text-xl font-extrabold tracking-tight text-emerald-700 sm:text-2xl dark:text-[#69d279]">4s</strong>
                <span className="mt-1 block text-[10px] font-medium leading-tight text-slate-500 sm:text-[11px] dark:text-[#9aabc4]">Sample call reply</span>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[440px] px-3 sm:px-8 lg:px-4">
            <HomePhoneDemo />
          </div>
        </div>
      </section>

      <ProductShowcase />

      {/* An illustrative activity strip, populated from the same sample dashboard. */}
      {recentBookings.length > 0 && (
        <section aria-label="Recent sample bookings" className="border-b border-slate-200 bg-white py-3 dark:border-[#14213a] dark:bg-[#071024]">
          <div className="mx-auto flex max-w-[1280px] items-center gap-4 overflow-hidden px-5 sm:px-8">
            <span className="hidden shrink-0 items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-emerald-700 sm:flex dark:text-[#69d279]"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Sample activity</span>
            <div className="min-w-0 overflow-x-auto">
              <div className="flex w-max gap-2">
                {recentBookings.map((booking) => (
                  <span key={booking.id} className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[11px] text-slate-600 dark:border-[#192b4b] dark:bg-[#08142a] dark:text-[#aebbd0]">
                    <strong className="text-emerald-700 dark:text-[#72d680]">{booking.serviceName.split(" & ")[0]}</strong> · {booking.customerName} · {booking.time}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Salon floor preview from the reference, with clearly labelled sample imagery. */}
      <section className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-[#182a4b] dark:bg-[#071228]">
          <div className="relative h-64 lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[58%]">
            <Image src="/images/salon-interior-hero.jpg" alt="Sample salon interior with styling chairs" fill sizes="(max-width: 1024px) 100vw, 700px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-white lg:via-white/20 lg:to-transparent dark:from-[#071228] dark:lg:from-[#071228] dark:lg:via-[#071228]/25" />
            <span className="absolute bottom-3 right-3 rounded-md bg-[#071228]/85 px-2.5 py-1.5 text-[10px] font-medium text-slate-200">Sample imagery for salon demo</span>
          </div>
          <div className="relative z-10 max-w-[610px] p-6 sm:p-9 lg:py-10 lg:pl-10 lg:pr-4">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[.1em] text-emerald-800 dark:bg-[#0d3322] dark:text-[#79db87]"><Sparkles size={13} /> Salon floor preview</span>
            <h2 className="mt-4 text-2xl font-extrabold leading-[1.15] tracking-tight text-[#09265d] sm:text-3xl lg:text-[34px] dark:text-[#f2f5ff]">Floor par controlled system — har chair aur stylist ka hisaab</h2>
            <p className="mt-4 max-w-[500px] text-sm leading-7 text-slate-600 dark:text-[#a3b0c8]">WordbitX ke saath salon ka floor aik controlled system ban jata hai: har chair ka schedule, har stylist ka load, har service ka rate — aur har khaali slot ke liye ready waitlist.</p>
            <ul className="mt-5 space-y-2.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              {[
                "Chair-by-chair schedule, stylist ke hisaab se",
                "Har service ka exact PKR rate aur duration",
                "Empty slot → waitlist guest ko offer",
                "Client ki preferred stylist ke saath booking",
              ].map((item) => <li key={item} className="flex items-start gap-2.5"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-[#69d279]" />{item}</li>)}
            </ul>
            <Link href="/dashboard" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1ca830] px-5 text-sm font-bold text-white transition hover:bg-[#168d2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"><LayoutDashboard size={16} /> Floor dashboard dekhein <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      {/* Four places where a salon can lose a booking. */}
      <section className="border-y border-slate-200 bg-white/70 dark:border-[#14213a] dark:bg-[#050d1e]">
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 lg:py-20">
          <span className="text-[11px] font-extrabold uppercase tracking-[.16em] text-emerald-700 dark:text-[#69d279]">Pitch growth nahi, recovery hai</span>
          <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <h2 className="max-w-2xl text-2xl font-extrabold leading-tight text-[#09265d] sm:text-3xl dark:text-[#f2f5ff]">Receptionist ko replace nahi — us ka overflow pakarta hai.</h2>
            <p className="max-w-md text-sm leading-6 text-slate-500 dark:text-[#9aabc4]">Chaar jagah jahan bookings miss ho sakti hain. Neeche diye gaye flows illustrative demo hain.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {leaks.map((leak) => (
              <article key={leak.title} className="flex min-h-[245px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400/60 dark:border-[#182a4b] dark:bg-[#071228] dark:hover:border-emerald-600/60">
                <div>
                  <span className="inline-block rounded-md bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 dark:bg-[#0d3322] dark:text-[#79db87]">{leak.time}</span>
                  <h3 className="mt-4 text-sm font-bold text-[#102a50] dark:text-slate-100">{leak.title}</h3>
                  <p className="mt-2.5 text-[13px] leading-[1.7] text-slate-600 dark:text-[#9aabc4]">{leak.description}</p>
                </div>
                <p className="mt-5 border-t border-slate-100 pt-4 text-xs font-semibold leading-5 text-emerald-700 dark:border-[#1a2b4b] dark:text-[#a5e3ad]">{leak.solution}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison is a table on larger screens and readable cards on phones. */}
      <section className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 lg:py-20">
        <span className="text-[11px] font-extrabold uppercase tracking-[.16em] text-emerald-700 dark:text-[#69d279]">Capability matrix</span>
        <h2 className="mt-3 text-2xl font-extrabold leading-tight text-[#09265d] sm:text-3xl dark:text-[#f2f5ff]">Free WhatsApp App vs. Receptionist Alone vs. WordbitX</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-[#9aabc4]">Meta ka Cloud API sirf rasta (pipe) hai — dimagh us ke upar banana parta hai. Dimagh + setup + maintenance hi yeh product hai.</p>
        <div className="mt-8 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block dark:border-[#182a4b] dark:bg-[#071228]">
          <table className="w-full table-fixed text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:border-[#182a4b] dark:bg-[#0a1932] dark:text-[#91a4c0]"><tr><th className="px-5 py-4">Capability</th><th className="px-5 py-4">Free WhatsApp App</th><th className="px-5 py-4">Receptionist alone</th><th className="px-5 py-4 text-emerald-700 dark:text-[#79db87]">WordbitX demo</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#182a4b]">
              {comparisonRows.map((row) => <tr key={row.feature}><th scope="row" className="px-5 py-4 font-bold text-[#102a50] dark:text-slate-100">{row.feature}</th><td className="px-5 py-4 text-slate-500 dark:text-[#9aabc4]">{row.freeApp}</td><td className="px-5 py-4 text-slate-500 dark:text-[#9aabc4]">{row.receptionist}</td><td className="px-5 py-4 font-semibold text-emerald-700 dark:text-[#a5e3ad]"><span className="flex items-start gap-2"><Check size={14} className="shrink-0" />{row.wordbitx}</span></td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="mt-7 grid gap-3 md:hidden">
          {comparisonRows.map((row) => <article key={row.feature} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#182a4b] dark:bg-[#071228]"><h3 className="text-sm font-bold text-[#102a50] dark:text-white">{row.feature}</h3><dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-4"><dt className="text-slate-500 dark:text-[#91a4c0]">Free app</dt><dd className="text-right text-slate-700 dark:text-slate-300">{row.freeApp}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500 dark:text-[#91a4c0]">Receptionist</dt><dd className="text-right text-slate-700 dark:text-slate-300">{row.receptionist}</dd></div><div className="flex justify-between gap-4 border-t border-slate-100 pt-2 dark:border-[#182a4b]"><dt className="font-bold text-emerald-700 dark:text-[#79db87]">WordbitX demo</dt><dd className="text-right font-semibold text-emerald-700 dark:text-[#a5e3ad]">{row.wordbitx}</dd></div></dl></article>)}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-[#8797b3]">Live WhatsApp integration is planned for Phase 2, after Meta verification. This preview does not send messages.</p>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 pb-16 sm:px-8 lg:pb-20">
        <div className="flex flex-col items-start justify-between gap-7 rounded-3xl border border-emerald-200 bg-emerald-50 p-7 sm:p-10 md:flex-row md:items-center dark:border-emerald-900/60 dark:bg-[#09251d]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.13em] text-emerald-700 dark:text-[#79db87]"><ShieldCheck size={15} /> Made for Lahore salons</span>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight text-[#09265d] sm:text-3xl dark:text-white">Aap ki aglay booking miss na ho.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-emerald-100/70">Apne salon ke services aur rates ke saath demo dekhein. WordbitX ki team setup aur aglay steps mein madad karegi.</p>
          </div>
          <button type="button" onClick={() => openConsultationWithPlan()} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-[#1ca830] px-5 text-sm font-bold text-white transition hover:bg-[#168d2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"><MessageCircle size={16} /> Enquiry karein <ArrowRight size={15} /></button>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-[#8797b3]"><span className="inline-flex items-center gap-1.5"><Clock3 size={14} className="text-emerald-600" /> 24h setup SLA</span><span className="inline-flex items-center gap-1.5"><PhoneMissed size={14} className="text-emerald-600" /> Missed call recovery demo</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-600" /> No real messages sent</span></div>
      </section>
    </div>
  );
}

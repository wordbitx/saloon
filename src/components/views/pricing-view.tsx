"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { PRICING_PLANS, WORDBITX_COMPANY } from "@/lib/constants";

export default function PricingView() {
  const { openConsultationWithPlan } = useSalon();
  const [currency, setCurrency] = useState<"PKR" | "USD">("PKR");

  return (
    <section id="pricing" className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-200">
      {/* Pricing Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-[#1CA830] text-xs font-semibold border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Confirmed WordbitX Pricing</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-[#052767] dark:text-white">
          Transparent Salon Recovery Plans
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Sirf 1 se 2 recovered Balayage ya Bridal treatments poore mahine ki software cost cover kar
          lete hain. Baqi sab direct recovery cashflow hai.
        </p>

        {/* Currency Switcher */}
        <div className="pt-2 flex justify-center">
          <div className="p-1 rounded-xl bg-slate-200 dark:bg-[#071531] inline-flex items-center gap-1 border border-slate-300 dark:border-slate-800">
            <button
              onClick={() => setCurrency("PKR")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currency === "PKR"
                  ? "bg-white dark:bg-[#050d21] text-[#052767] dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Pakistan (PKR)
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currency === "USD"
                  ? "bg-white dark:bg-[#050d21] text-[#052767] dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
              }`}
            >
              International (USD)
            </button>
          </div>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
        {PRICING_PLANS.map((plan) => {
          const price = currency === "PKR" ? `PKR ${plan.pricePKR.toLocaleString()}` : `$${plan.priceUSD}`;
          return (
            <div
              key={plan.id}
              className={`p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#050d21] flex flex-col justify-between space-y-6 transition-all ${
                plan.popular
                  ? "border-2 border-[#1CA830] shadow-xl relative"
                  : "border border-slate-200 dark:border-slate-800 shadow-xs"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#1CA830] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                  Most Popular · Lahore Salons
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {plan.name}
                  </span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[#052767] dark:text-white tracking-tight">
                      {price}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ month</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {plan.summary}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                    Shamil Features:
                  </span>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {plan.features.map((f, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-[#1CA830] shrink-0 mt-0.5" />
                        <span className={fIdx === 0 && plan.popular ? "font-bold text-slate-900 dark:text-white" : ""}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => openConsultationWithPlan(`${plan.name} Plan (${price} / mo)`)}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    plan.popular
                      ? "bg-[#1CA830] hover:bg-[#178e29] text-white shadow-md shadow-emerald-500/20"
                      : "bg-[#052767] hover:bg-[#0a3582] text-white"
                  }`}
                >
                  <span>Enquire for {plan.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <div className="text-[10px] text-center text-slate-400 mt-2">
                  Enquiry handled via {WORDBITX_COMPANY.email}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Setup & Sale Policy Notes */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21] space-y-1">
          <div className="font-bold text-[#052767] dark:text-white flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#1CA830]" />
            <span>Optional WordbitX Setup (PKR 5,000 / $29)</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            WordbitX team aap ki saari services, prices, stylers aur custom FAQs khud system mein
            enter karegi — 24 ghante mein system ready.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21] space-y-1">
          <div className="font-bold text-[#052767] dark:text-white flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-[#1CA830]" />
            <span>Phase 1 Sale via Direct Enquiry</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Phase 1 mein koi automated checkout nahi hai. Sale direct enquiry aur onboarding discussion
            par hoti hai:{" "}
            <a href={`mailto:${WORDBITX_COMPANY.email}`} className="text-[#1CA830] font-bold underline">
              {WORDBITX_COMPANY.email}
            </a>
          </p>
        </div>
      </div>

      {/* Official Meta WhatsApp Cloud API Architecture & Specs */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#050d21] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1CA830] uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Official Meta WhatsApp Cloud API Specs</span>
        </div>

        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#052767] dark:text-white">
            Meta Business Verification & Approved Templates
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Meta ka Cloud API sirf pipe (rasta) hai — dimagh us ke upar banana parta hai. WordbitX
            sirf official Meta Cloud API ke sath integrate karta hai:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071531] border border-slate-200 dark:border-slate-800 space-y-1.5">
            <strong className="text-[#052767] dark:text-white block font-bold">
              1. Meta Verification
            </strong>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Salon ka Meta Business Manager verify kiya jata hai. Official blue/green WhatsApp badge
              eligibility banti hai.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071531] border border-slate-200 dark:border-slate-800 space-y-1.5">
            <strong className="text-[#052767] dark:text-white block font-bold">
              2. Approved Templates
            </strong>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Appointment reminders, missed-call follow-ups aur review requests pehle se Meta se
              approved hote hain.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071531] border border-slate-200 dark:border-slate-800 space-y-1.5">
            <strong className="text-[#052767] dark:text-white block font-bold">
              3. Zero Spam Guarantee
            </strong>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Koi unofficial ya personal-number automation nahi. Koi cold spamming nahi. Customer jab
              message ya call kare, sirf tabhi response jata hai.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

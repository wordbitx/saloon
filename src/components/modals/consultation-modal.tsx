"use client";

import React, { useState } from "react";
import { CheckCircle2, ShieldCheck, Sparkles, X } from "lucide-react";
import { WORDBITX_COMPANY } from "@/lib/constants";

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlanName?: string;
}

export default function ConsultationModal({
  isOpen,
  onClose,
  selectedPlanName = "Growth Plan (Most Popular)",
}: ConsultationModalProps) {
  const [salonName, setSalonName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("DHA Phase 5, Lahore");
  const [plan, setPlan] = useState(selectedPlanName);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const areas = [
    "DHA Phase 5, Lahore",
    "Gulberg III, Lahore",
    "Johar Town, Lahore",
    "Model Town, Lahore",
    "Cantt / Cavalry, Lahore",
    "Bahria Town, Lahore",
    "WAPDA Town, Lahore",
    "Faisal Town, Lahore",
    "Other Lahore Area",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#050d21] border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100 shadow-2xl">
        {/* Brand green top accent line */}
        <div className="absolute top-0 left-6 right-6 h-[2.5px] bg-[#1CA830]" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-[#1CA830]/20 text-[#1CA830] dark:text-[#61d171] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#052767] dark:text-white">
              Enquiry Received by WordbitX Lahore!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              Shukriya {managerName || "ji"}! WordbitX ki salon onboarding team{" "}
              <strong>24 ghante (hours)</strong> ke andar aap ke salon ({salonName || "Salon"}) ke
              liye dedicated engineering pipeline activate karegi.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071531] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              Direct Contact: <strong>{WORDBITX_COMPANY.phonePK}</strong> ·{" "}
              <strong>{WORDBITX_COMPANY.email}</strong>
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#1CA830] hover:bg-[#178e29] transition-colors"
            >
              Done / Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1CA830] uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>WordbitX Lahore · 24-Hour Setup</span>
              </div>
              <h3 className="text-lg font-bold text-[#052767] dark:text-white">
                Book Salon Engineering Setup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Phase 1 mein sale direct consultation se hoti hai. Hum 24 ghante ke andar aap ki
                services aur rates enter kar ke system ready karte hain.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Salon Name *
                </label>
                <input
                  required
                  type="text"
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  placeholder="e.g. Glow Studio, Sabs, Toni&Guy Lahore"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1CA830]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Owner / Manager Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Aap ka naam"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1CA830]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Phone Number *
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300-XXXXXXX"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1CA830]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lahore Area *
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1CA830]"
                  >
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Interested Plan
                  </label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1CA830]"
                  >
                    <option value="Starter (PKR 5,000 / mo)">Starter (PKR 5,000 / mo)</option>
                    <option value="Growth Plan (PKR 10,000 / mo)">
                      Growth Plan (PKR 10,000 / mo) — Most Popular
                    </option>
                    <option value="Business Plan (PKR 15,000 / mo)">
                      Business Plan (PKR 15,000 / mo)
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1CA830] shrink-0" />
              <span>
                Zero spam guarantee. Official Meta Cloud API pipeline setup within 24 hours.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#1CA830] hover:bg-[#178e29] shadow-md shadow-emerald-500/20 transition-all active:scale-95"
              >
                Submit Setup Request (24h SLA)
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

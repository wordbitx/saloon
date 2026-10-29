"use client";

import React from "react";
import { BellRing, CalendarDays, CheckCircle2, Clock3, MessageCircle, X } from "lucide-react";
import { useSalon } from "@/context/salon-context";

interface MorningBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MorningBriefModal({ isOpen, onClose }: MorningBriefModalProps) {
  const { settings, bookings } = useSalon();

  if (!isOpen) return null;

  const todayBookings = bookings.filter((b) => b.date === "Today" && b.status !== "cancelled");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#050d21] border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100 shadow-2xl space-y-4">
        {/* Brand green top accent line */}
        <div className="absolute top-0 left-6 right-6 h-[2.5px] bg-[#1CA830]" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1CA830]/20 text-[#1CA830] dark:text-[#61d171] flex items-center justify-center">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#1CA830] uppercase tracking-wider block">
                Business Plan Feature
              </span>
              <h3 className="text-base font-bold text-[#052767] dark:text-white">
                Subah ki Brief (Daily Morning Snapshot)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071531] border border-slate-200 dark:border-slate-800 text-xs space-y-3">
          <div className="font-semibold text-emerald-800 dark:text-emerald-300">
            ☀️ Assalam o Alaikum! Aaj ki salon summary ({settings.name}):
          </div>

          <div className="space-y-2 text-slate-700 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <CalendarDays className="w-4 h-4 text-[#1CA830] shrink-0 mt-0.5" />
              <div>
                <strong>{todayBookings.length} Confirmed Bookings</strong> schedule par hain:
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {todayBookings.slice(0, 3).map((b) => `${b.customerName} (${b.time})`).join(" · ")}
                  {todayBookings.length > 3 ? " aur mazeed..." : ""}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock3 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>2 Empty Chair Slots</strong> afternoon mein available hain (02:00 PM & 04:30 PM).
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <strong>18 Missed Inquiries</strong> kal raat assistant ne auto-answer karke attend kiye.
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
            📍 <strong>Active Branches:</strong> {settings.branches.map((b) => b.name).join(", ")}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Yeh snapshot roz subah 9:00 AM par salon owner ko WhatsApp par automated daily briefing ke
          taur par deliver hota hai.
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#052767] hover:bg-[#0a3582] text-white font-bold text-xs transition-colors"
        >
          Close Morning Brief
        </button>
      </div>
    </div>
  );
}

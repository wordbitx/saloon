"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BatteryFull,
  CheckCheck,
  PhoneMissed,
  RotateCcw,
  SignalHigh,
  Wifi,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";

type Turn = {
  side: "in" | "out";
  text: string;
  minutesAgo?: string;
};

const SCRIPT: Turn[] = [
  {
    side: "in",
    text: "Assalam o alaikum! Main Saturday ko bridal makeup ki booking chahti hoon — Barat wali.",
    minutesAgo: "Just now",
  },
  {
    side: "out",
    text: "Walaikum Assalam! Signature Bridal Makeup (Barat) PKR 45,000 · 3 ghante. December ki kon si tarikh pasand hai?",
    minutesAgo: "Just now",
  },
  {
    side: "in",
    text: "13th December, shaam 5 baje.",
    minutesAgo: "Just now",
  },
  {
    side: "out",
    text: "Done! 13 Dec, 5:00 PM — Aliya Noor (Bridal glam artist) ke saath Signature Bridal Makeup confirm. Aap ki WhatsApp pe reminder bhej di. Shukriya!",
    minutesAgo: "Just now",
  },
  {
    side: "in",
    text: "Shukriya! Ghanti bhi aa gai thi, reply ab nahi kar paati.",
    minutesAgo: "Just now",
  },
  {
    side: "out",
    text: "Ghanti miss hui thi — khud WhatsApp pe reply kar diya gaya. Booking rahe gi confirm. Naya number kabhi call karna, welcome hai!",
    minutesAgo: "Just now",
  },
];

export default function HomePhoneDemo() {
  const { settings } = useSalon();
  const [turn, setTurn] = useState(0);
  const [shown, setShown] = useState<Turn[]>([]);
  const lock = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [shown]);

  // Auto-play: shows one turn after another so a visitor immediately sees the
  // full salon flow — ghanti → question → booking confirmation.
  useEffect(() => {
    if (turn >= SCRIPT.length) return;
    const timer = setTimeout(() => {
      if (!lock.current) {
        setShown((prev) => [...prev, SCRIPT[turn]]);
        setTurn((current) => current + 1);
      }
    }, 1100);
    return () => clearTimeout(timer);
  }, [turn]);

  const reset = () => {
    lock.current = true;
    setShown([]);
    setTurn(0);
    setTimeout(() => (lock.current = false), 100);
  };

  const started = shown.length > 0;

  return (
    <div className="relative mx-auto w-full max-w-[280px] select-none">
      {/* Phone body */}
      <div className="rounded-[40px] border-[8px] border-[#14171c] bg-[#14171c] shadow-2xl">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-[#14171c] px-5 pt-2 text-[9px] font-semibold text-white">
          <span className="tracking-wide">9:41</span>
          <span className="flex items-center gap-1">
            <SignalHigh className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <BatteryFull className="h-3 w-3" />
          </span>
        </div>

        {/* Chat screen */}
        <div className="h-[460px] overflow-hidden bg-[#efeae2]">
          <div className="flex items-center justify-between bg-[#075e54] px-3 py-2 text-white">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold leading-tight truncate">{settings.name}</div>
              <div className="text-[9px] text-white/70 leading-tight flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" /> online
              </div>
            </div>
            <span className="text-[14px] font-semibold">···</span>
          </div>

          {/* Chat bubbles */}
          <div className="space-y-2 overflow-y-auto px-2.5 py-3 h-[390px]">
            {shown.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.side === "out" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-2.5 py-1.5 text-[10px] leading-relaxed shadow-sm ${
                    msg.side === "out"
                      ? "bg-[#dcf8c6] text-[#111b21] rounded-br-sm"
                      : "bg-white text-[#111b21] rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div
                    className={`mt-0.5 flex items-center justify-end gap-0.5 text-[7px] ${
                      msg.side === "out" ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {msg.side === "out" ? <CheckCheck className="h-2.5 w-2.5" /> : null}
                    <span>{msg.minutesAgo}</span>
                  </div>
                </div>
              </div>
            ))}
            {turn < SCRIPT.length && (
              <div className="flex justify-end">
                <div className="flex gap-1 rounded-2xl rounded-br-sm bg-[#dcf8c6] px-2.5 py-2 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input bar (decorative) */}
          <div className="flex items-center gap-2 bg-[#f0f2f5] px-2.5 py-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] text-slate-400">
              Type a message
            </span>
            <span className="rounded-full bg-[#075e54] px-2.5 py-1 text-[9px] font-semibold text-white">
              Send
            </span>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center bg-[#14171c] pb-1.5">
          <span className="h-1 w-8 rounded-full bg-white/60" />
        </div>
      </div>

      {/* Floating call badge */}
      <div className="absolute -left-2 top-40 flex items-center gap-1.5 rounded-full border border-amber-200 bg-white/95 px-2 py-1 text-[8px] font-bold text-amber-700 shadow-lg dark:bg-slate-900/95 dark:text-amber-300">
        <PhoneMissed className="h-3 w-3" />
        Missed call — 4s mein reply bhej diya
      </div>

      {/* Replay control */}
      <div className="mt-4 flex justify-center">
        {!started ? (
          <button
            onClick={() => {
              setShown([]);
              setTurn(1);
              setShown([SCRIPT[0]]);
            }}
            className="rounded-xl bg-[#052767] px-3.5 py-2 text-[10px] font-bold text-white shadow-lg"
          >
            Conversation play karein
          </button>
        ) : (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[10px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <RotateCcw className="h-3 w-3" />
            Fir se chalayein
          </button>
        )}
      </div>
    </div>
  );
}

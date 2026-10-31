"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  CheckCheck,
  Pause,
  PhoneMissed,
  Play,
  RotateCcw,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";

type Turn = {
  side: "customer" | "salon";
  text: string;
};

// This is an illustrative conversation, not a connection to WhatsApp. Keep its
// service and price consistent with the sample salon menu.
const SCRIPT: Turn[] = [
  { side: "customer", text: "Assalam o Alaikum, facial ka rate kya hai?" },
  { side: "salon", text: "Walaikum Assalam! HydraFacial PKR 7,500 (60 min). Kal 02:00 PM ka slot khali hai — book kar dun?" },
  { side: "customer", text: "Haan please!" },
  { side: "salon", text: "Zaroor — aap ka naam bata dein?" },
  { side: "customer", text: "Mahnoor." },
  { side: "salon", text: "Shukriya Mahnoor! Aap ka sample appointment kal 02:00 PM ke liye confirm hai. Reminder bhi tayyar hai. ✨" },
];

export default function HomePhoneDemo() {
  const { settings } = useSalon();
  const [visibleCount, setVisibleCount] = useState(1);
  const [playing, setPlaying] = useState(true);
  const conversationRef = useRef<HTMLDivElement>(null);
  const salonName = settings.name === "Your salon" ? "Glow Salon, Lahore" : settings.name;

  // Respect the user's motion preference: show the whole example without autoplay.
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      if (motion.matches) {
        setVisibleCount(SCRIPT.length);
        setPlaying(false);
      }
    };
    handleMotionChange();
    motion.addEventListener("change", handleMotionChange);
    return () => motion.removeEventListener("change", handleMotionChange);
  }, []);

  // Play the conversation one message at a time, then start again after a pause.
  // This never sends a message or changes the sample booking data.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setVisibleCount((count) => (count >= SCRIPT.length ? 1 : count + 1));
    }, visibleCount >= SCRIPT.length ? 6000 : 1900);
    return () => window.clearTimeout(timer);
  }, [playing, visibleCount]);

  useEffect(() => {
    // Scroll only the conversation, not the entire page when new messages arrive.
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [visibleCount]);

  const replay = () => {
    setVisibleCount(1);
    setPlaying(true);
  };
  const nextIsSalon = SCRIPT[visibleCount]?.side === "salon";

  return (
    <div className="relative mx-auto w-full max-w-[370px] px-2 sm:px-0">
      <div className="rounded-[38px] border border-slate-300 bg-slate-100 p-2.5 shadow-[0_24px_80px_rgba(5,39,103,0.14)] dark:border-[#142a4f] dark:bg-[#061128] dark:shadow-[0_24px_90px_rgba(0,0,0,0.3)]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-[#142a4f] dark:bg-[#030a19]">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-[#142341] dark:bg-[#07142c]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1ca830] text-sm font-extrabold text-white">
              {salonName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#102a50] dark:text-white">{salonName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-[#78db88]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Auto-reply demo
              </p>
            </div>
            <span className="rounded-md border border-dashed border-emerald-500/60 px-1.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-[#78db88]">
              Sample
            </span>
          </div>

          <div
            ref={conversationRef}
            role="log"
            aria-label="Illustrative salon conversation"
            aria-live="off"
            className="h-[340px] overflow-y-auto overscroll-contain bg-[#f7faf8] px-3 py-4 sm:h-[370px] dark:bg-[#030a19]"
          >
            <div className="flex min-h-full flex-col justify-end gap-2.5">
              {SCRIPT.slice(0, visibleCount).map((message, index) => (
                <div
                  key={index}
                  className={`home-message-enter flex ${message.side === "customer" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-[1.5] shadow-sm ${message.side === "customer" ? "rounded-br-md bg-[#e9f0fa] text-[#182c4f] dark:bg-[#0c1d3c] dark:text-slate-100" : "rounded-bl-md bg-[#daf3dc] text-[#12351e] dark:bg-[#103c24] dark:text-[#e5f9e8]"}`}>
                    <p>{message.text}</p>
                    <span className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${message.side === "salon" ? "text-emerald-700 dark:text-emerald-300/70" : "text-slate-500 dark:text-slate-400"}`}>
                      {message.side === "salon" && <CheckCheck size={12} />} Demo
                    </span>
                  </div>
                </div>
              ))}
              {playing && nextIsSalon && (
                <div className="flex justify-start" aria-label="Sample reply is being typed">
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-[#daf3dc] px-3 py-2.5 dark:bg-[#103c24]">
                    <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-3 dark:border-[#142341] dark:bg-[#07142c]">
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[11px] text-slate-500 dark:border-[#142a4f] dark:bg-[#0a1933] dark:text-slate-400">
              Simulated chat · Phase 1 demo
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -left-1 top-[76px] z-10 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-[#17345d] shadow-lg sm:-left-9 dark:border-[#1b3157] dark:bg-[#07142c] dark:text-slate-100">
        <PhoneMissed size={15} className="text-emerald-500 dark:text-[#78db88]" />
        <span>Missed call → 4s reply <span className="text-emerald-600 dark:text-[#78db88]">· demo</span></span>
      </div>
      <div className="absolute -right-1 bottom-[98px] z-10 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-[#17345d] shadow-lg sm:-right-6 dark:border-[#1b3157] dark:bg-[#07142c] dark:text-slate-100">
        <BellRing size={14} className="text-emerald-500 dark:text-[#78db88]" /> 2h before reminder
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <button type="button" onClick={() => setPlaying((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition hover:bg-slate-100 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-[#0a1933] dark:hover:text-emerald-300" aria-label={playing ? "Pause sample conversation" : "Play sample conversation"}>
          {playing ? <Pause size={13} /> : <Play size={13} />} {playing ? "Pause" : "Play"}
        </button>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
        <button type="button" onClick={replay} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition hover:bg-slate-100 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-[#0a1933] dark:hover:text-emerald-300">
          <RotateCcw size={13} /> Replay demo
        </button>
      </div>
    </div>
  );
}

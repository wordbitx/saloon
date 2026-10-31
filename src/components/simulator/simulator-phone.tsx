"use client";

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  BatteryFull,
  CheckCheck,
  ChevronLeft,
  Mic,
  Moon,
  RotateCcw,
  Send,
  ShieldAlert,
  SignalHigh,
  Sun,
  Wifi,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { SimulatorMessage } from "@/lib/simulator-engine";

function subscribeToSystemTheme(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function systemIsDark() { return window.matchMedia("(prefers-color-scheme: dark)").matches; }
function serverSystemIsDark() { return false; }

interface SimulatorPhoneProps {
  messages: SimulatorMessage[];
  isTyping: boolean;
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (text?: string) => void;
  onVoiceNote: () => void;
  onReset: () => void;
  ownerOverride: boolean;
  onToggleOverride: () => void;
}

export default function SimulatorPhone({
  messages,
  isTyping,
  inputText,
  setInputText,
  onSend,
  onVoiceNote,
  onReset,
  ownerOverride,
  onToggleOverride,
}: SimulatorPhoneProps) {
  const { settings, theme } = useSalon();
  const prefersDark = useSyncExternalStore(subscribeToSystemTheme, systemIsDark, serverSystemIsDark);
  const resolvedTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  const appearanceKey = `${theme}:${resolvedTheme}`;
  const [appearance, setAppearance] = useState<{ key: string; value: "light" | "dark" }>({ key: appearanceKey, value: resolvedTheme });
  // A manual phone toggle lasts until the site/device theme changes.
  if (appearance.key !== appearanceKey) setAppearance({ key: appearanceKey, value: resolvedTheme });
  const [clock, setClock] = useState("9:41");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const chat = chatRef.current;
    if (chat) chat.scrollTop = chat.scrollHeight;
  }, [messages, isTyping]);

  const light = (appearance.key === appearanceKey ? appearance.value : resolvedTheme) === "light";

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/* Device label + WhatsApp appearance switch */}
      <div className="flex w-full max-w-[372px] items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold shadow-sm dark:border-slate-800 dark:bg-[#050d21]">
        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-3 w-3 rounded-full border border-slate-300 bg-gradient-to-br from-[#334155] to-[#0f172a]" />
          Customer phone · WhatsApp view
        </span>
        <button
          type="button"
          onClick={() => setAppearance({ key: appearanceKey, value: light ? "dark" : "light" })}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 transition ${
            light
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-slate-700 bg-slate-900 text-slate-200"
          }`}
          title="Switch WhatsApp appearance inside the phone"
        >
          {light ? <Sun size={11} /> : <Moon size={11} />}
          {light ? "Light" : "Dark"}
        </button>
      </div>

      {/* Phone shell */}
      <div className="relative w-full max-w-[372px] rounded-[46px] border-[3px] border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900 p-[11px] shadow-2xl shadow-slate-950/25 dark:border-slate-600">
        <span className="absolute -left-[6px] top-[104px] h-8 w-[4px] rounded-l bg-slate-600" />
        <span className="absolute -left-[6px] top-[148px] h-11 w-[4px] rounded-l bg-slate-600" />
        <span className="absolute -right-[6px] top-[132px] h-16 w-[4px] rounded-r bg-slate-600" />

        <div
          className={`flex h-[620px] flex-col overflow-hidden rounded-[38px] transition-colors ${
            light ? "bg-[#efeae2] text-slate-900" : "bg-[#0b141a] text-slate-100"
          }`}
        >
          {/* iOS status bar */}
          <div className={`relative flex shrink-0 items-center justify-between px-5 pb-1 pt-3 text-white ${light ? "bg-[#075E54]" : "bg-[#1f2c34]"}`}>
            <span className="text-[12px] font-bold">{clock}</span>
            <div className="absolute left-1/2 top-[6px] flex h-[22px] w-[92px] -translate-x-1/2 items-center justify-end gap-1.5 rounded-full bg-black px-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="h-2 w-2 rounded-full border border-slate-700 bg-[#0a1128]" />
            </div>
            <span className="flex items-center gap-1">
              <SignalHigh size={12} strokeWidth={2.6} />
              <Wifi size={12} strokeWidth={2.6} />
              <BatteryFull size={15} strokeWidth={2.4} />
            </span>
          </div>

          {/* WhatsApp header */}
          <div className={`flex shrink-0 items-center justify-between px-3 py-2 text-white ${light ? "bg-[#075E54]" : "bg-[#1f2c34]"}`}>
            <div className="flex min-w-0 items-center gap-2">
              <ChevronLeft size={19} className="shrink-0 text-white/80" />
              <div className="relative shrink-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[11px] font-extrabold text-[#075E54]">
                  {settings.name.slice(0, 1)}
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#075E54] bg-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <strong className="truncate text-[11px] font-bold">{settings.name}</strong>
                  <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-[#1CA830] text-[8px] font-bold">✓</span>
                </div>
                <p className="text-[9px] leading-none text-emerald-100">
                  {ownerOverride ? "Owner takeover active" : isTyping ? "typing…" : "online · verified business"}
                </p>
              </div>
            </div>
            <button onClick={onReset} title="Reset conversation" className="rounded p-1 text-white/90 hover:bg-white/10">
              <RotateCcw size={13} />
            </button>
          </div>

          {ownerOverride && (
            <div className="flex shrink-0 items-center justify-between bg-amber-500 px-3 py-1 text-[10px] font-bold text-amber-950">
              <span className="flex items-center gap-1.5"><ShieldAlert size={12} /> Owner override active</span>
              <button onClick={onToggleOverride} className="underline">Resume AI</button>
            </div>
          )}

          {/* Chat */}
          <div ref={chatRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-[11px]">
            <div className="flex justify-center">
              <span className={`rounded-md px-2 py-1 text-center text-[9px] ${light ? "bg-[#ffeecd] text-amber-900" : "bg-[#182229] text-amber-200/90"}`}>
                🔒 End-to-end encrypted · simulated WordbitX conversation
              </span>
            </div>

            {messages.map((msg) => {
              const customer = msg.sender === "customer";
              const owner = msg.sender === "owner_override";
              return (
                <div key={msg.id} className={`flex ${customer ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[86%] rounded-2xl px-3 py-2 leading-relaxed shadow-sm ${
                      customer
                        ? light
                          ? "rounded-tr-sm bg-[#d9fdd3] text-slate-900"
                          : "rounded-tr-sm bg-[#005c4b] text-white"
                        : owner
                          ? "rounded-tl-sm bg-[#052767] text-white"
                          : light
                            ? "rounded-tl-sm border border-slate-200 bg-white text-slate-900"
                            : "rounded-tl-sm border border-slate-700/50 bg-[#202c33] text-slate-100"
                    }`}
                  >
                    {owner && <div className="mb-0.5 flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-wider text-amber-300"><ShieldAlert size={10} /> Salon owner</div>}
                    {msg.isAudio ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white"><Mic size={12} /></span>
                          <span className={`h-1 flex-1 rounded-full ${light ? "bg-emerald-200" : "bg-emerald-500/40"}`}><span className="block h-full w-2/3 rounded-full bg-emerald-500" /></span>
                          <span className="text-[9px] opacity-70">{msg.audioDuration ?? "0:18"}</span>
                        </div>
                        <p className="italic opacity-90">{msg.text}</p>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    )}

                    {msg.options && msg.options.length > 0 && (
                      <div className={`mt-2 flex flex-col gap-1 border-t pt-2 ${light ? "border-slate-100" : "border-slate-700/60"}`}>
                        <span className={`text-[9px] font-bold ${light ? "text-emerald-700" : "text-emerald-400"}`}>Tap to reply:</span>
                        {msg.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => onSend(option)}
                            className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-[10px] font-semibold transition ${
                              light
                                ? "border-slate-200 bg-[#f0f2f5] text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
                                : "border-slate-700/60 bg-[#111b21] text-slate-200 hover:border-emerald-500"
                            }`}
                          >
                            <span className="truncate">{option}</span>
                            <ArrowRight size={11} className="shrink-0 text-[#1CA830]" />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className={`mt-1 flex items-center justify-end gap-1 text-[8px] ${light ? "text-slate-500" : "text-slate-400"}`}>
                      {msg.timestamp}
                      {customer && <CheckCheck size={11} className={light ? "text-sky-500" : "text-sky-400"} />}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="typing-dots border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#202c33]">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            )}
          </div>

          {/* Input bar */}
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              onSend();
            }}
            className={`flex shrink-0 items-center gap-1.5 border-t p-2 ${light ? "border-slate-200 bg-[#f0f2f5]" : "border-slate-800 bg-[#1f2c34]"}`}
          >
            <button
              type="button"
              onClick={onVoiceNote}
              title="Simulate voice note"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${light ? "border-slate-200 bg-white text-slate-600" : "border-slate-700 bg-[#111b21] text-slate-300"}`}
            >
              <Mic size={14} />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder={ownerOverride ? "Owner mode: type your reply…" : "Type Roman Urdu or English…"}
              className={`min-w-0 flex-1 rounded-full px-3 py-2 text-[11px] outline-none focus:ring-1 focus:ring-[#1CA830] ${
                light
                  ? "border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  : "border-0 bg-[#2a3942] text-white placeholder:text-slate-400"
              }`}
            />
            <button type="submit" aria-label="Send message" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1CA830] text-white hover:bg-[#178e29]">
              <Send size={13} />
            </button>
          </form>

          <div className={`mx-auto my-1.5 h-1 w-24 shrink-0 rounded-full ${light ? "bg-slate-400/60" : "bg-slate-700"}`} />
        </div>
      </div>
    </div>
  );
}

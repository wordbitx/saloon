"use client";

import React, { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  Clock3,
  CornerDownLeft,
  Gift,
  HelpCircle,
  Mic,
  MoreVertical,
  Phone,
  PhoneMissed,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import {
  EngineResult,
  SimulatorEngine,
  SimulatorMessage,
  SimulatorState,
} from "@/lib/simulator-engine";
import SimulatorPhone from "@/components/simulator/simulator-phone";

export default function SimulatorView() {
  const {
    settings,
    repeatCustomers,
    addBooking,
    ownerOverride,
    setOwnerOverride,
    toggleOwnerOverride,
    showToast,
    setActiveTab,
  } = useSalon();

  const [messages, setMessages] = useState<SimulatorMessage[]>([
    {
      id: "init-1",
      sender: "assistant",
      text: settings.greetingMessage,
      timestamp: "11:42 PM",
      options: [
        "HydraFacial Deep Glow (PKR 7,500)",
        "Signature Balayage (PKR 16,500)",
        "Signature Bridal Makeup (PKR 45,000)",
        "Signature Haircut (PKR 3,500)",
      ],
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeBranch, setActiveBranch] = useState<string>("idle");
  const [simState, setSimState] = useState<SimulatorState>({
    step: "awaiting_service",
    conversationBreadcrumbs: ["Greeting Sent"],
  });

  const handleSend = (overrideText?: string) => {
    const text = overrideText !== undefined ? overrideText : inputText;
    if (!text.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // If Owner Override is active, message comes from owner
    if (ownerOverride) {
      const ownerMsg: SimulatorMessage = {
        id: `owner-${Date.now()}`,
        sender: "owner_override",
        text: text.trim(),
        timestamp: time,
      };
      setMessages((prev) => [...prev, ownerMsg]);
      setInputText("");
      return;
    }

    // Customer message
    const custMsg: SimulatorMessage = {
      id: `cust-${Date.now()}`,
      sender: "customer",
      text: text.trim(),
      timestamp: time,
    };

    setMessages((prev) => [...prev, custMsg]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      const result: EngineResult = SimulatorEngine.processMessage(
        text.trim(),
        simState,
        settings,
        repeatCustomers
      );

      setIsTyping(false);
      setMessages((prev) => [...prev, result.reply]);
      setSimState(result.nextState);

      if (result.newBooking) {
        addBooking(result.newBooking);
      }
    }, 650);
  };

  const handleVoiceNote = (transcriptText?: string) => {
    const transcript =
      transcriptText ||
      "Salam! Mujhe Saturday ko HydraFacial Glow aur Blowdry karwana hai Hina Malik se. Kya afternoon ka slot mil sakta hai?";

    setIsTyping(true);
    const { customerMessage, assistantReply, nextState } = SimulatorEngine.processVoiceNote(
      transcript,
      simState,
      settings,
      repeatCustomers
    );

    setMessages((prev) => [...prev, customerMessage]);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, assistantReply]);
      setSimState(nextState);
    }, 750);
  };

  const resetSimulator = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: "assistant",
        text: settings.greetingMessage,
        timestamp: "11:42 PM",
        options: [
          "HydraFacial Deep Glow (PKR 7,500)",
          "Signature Balayage (PKR 16,500)",
          "Signature Bridal Makeup (PKR 45,000)",
          "Signature Haircut (PKR 3,500)",
        ],
      },
    ]);
    setSimState({
      step: "awaiting_service",
      conversationBreadcrumbs: ["Greeting Sent"],
    });
    setActiveBranch("idle");
    showToast("Simulator conversation reset to initial state.");
  };

  return (
    <section id="simulator" className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1CA830] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive WhatsApp Recovery Simulator</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#052767] dark:text-white">
            Live Mobile Simulation
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Branching state machine ke zariye different services, hair lengths, stylists aur rush
            hour slots test karein.
          </p>
        </div>

        {/* Owner Override Human Takeover Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21] shadow-xs">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#052767] dark:text-white flex items-center gap-1.5">
              <span>Owner Override (Human Takeover)</span>
              {ownerOverride && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  ACTIVE
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {ownerOverride
                ? "Assistant stopped; Owner can reply manually"
                : "Assistant auto-recovering in background"}
            </span>
          </div>
          <button
            onClick={toggleOwnerOverride}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              ownerOverride
                ? "bg-[#1CA830] text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            {ownerOverride ? "Takeover ON" : "Turn Takeover ON"}
          </button>
        </div>
      </div>

      {/* Main Grid: Left Presets & Controls, Right 3D Interactive Phone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Branching Scenarios & Presets */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21] shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1CA830] dark:text-[#9fdda8] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Conversational Branching Presets</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-[#1CA830] border border-emerald-500/20">
                DYNAMIC
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              In presets par click kar ke state machine ke dynamic branches test karein:
            </p>

            <div className="space-y-2 pt-1 text-xs">
              {/* Preset 1: Balayage & Hair Length */}
              <button
                onClick={() => {
                  setActiveBranch("branch_balayage");
                  setMessages([
                    {
                      id: `bal-in-${Date.now()}`,
                      sender: "customer",
                      text: "Assalam o alaikum! Balayage hair color karwana hai, charges aur procedure kya hai?",
                      timestamp: "10:30 PM",
                    },
                  ]);
                  setIsTyping(true);
                  setTimeout(() => {
                    setIsTyping(false);
                    setSimState({
                      step: "consulting_service_details",
                      activeBranch: "branch_balayage",
                      selectedService: "Balayage & Hair Gloss Treatment",
                      basePrice: 16500,
                      selectedPrice: 16500,
                      conversationBreadcrumbs: ["Branch: Hair Color (Balayage)"],
                    });
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `bal-out-${Date.now()}`,
                        sender: "assistant",
                        text: `✨ *Signature Balayage & Color Consultation*\n\nBehtareen dimensional finish ke liye hamari Master Colorist **Hina Malik** pehle hair length aur texture verify karti hain:\n\n1. *Shoulder Length:* Base PKR 16,500\n2. *Mid-Back / Waist Length:* PKR 19,500 (extra toner + gloss shamil)\n\nAap ke baal kis length ke hain, aur kya Olaplex bond repair add karna chahein gi?`,
                        timestamp: "10:30 PM",
                        options: [
                          "Shoulder Length (PKR 16,500)",
                          "Mid-Back / Long Hair (PKR 19,500)",
                          "Long Hair + Olaplex Bond Protection (PKR 22,000)",
                        ],
                      },
                    ]);
                  }, 650);
                }}
                className={`w-full text-left p-2.5 rounded-lg border transition-all font-medium flex items-center justify-between ${
                  activeBranch === "branch_balayage"
                    ? "border-[#1CA830] bg-[#1CA830]/10 text-[#052767] dark:text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#071531] dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs text-[#052767] dark:text-white">
                    💇‍♀️ Balayage & Hair Length Customization
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Length options → Olaplex upsell → Stylist Hina
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#1CA830]">TEST</span>
              </button>

              {/* Preset 2: HydraFacial */}
              <button
                onClick={() => {
                  setActiveBranch("branch_hydrafacial");
                  setMessages([
                    {
                      id: `hf-in-${Date.now()}`,
                      sender: "customer",
                      text: "HydraFacial ke details batayein please, weekend par event hai instant glow chahiye.",
                      timestamp: "09:15 PM",
                    },
                  ]);
                  setIsTyping(true);
                  setTimeout(() => {
                    setIsTyping(false);
                    setSimState({
                      step: "consulting_service_details",
                      activeBranch: "branch_hydrafacial",
                      selectedService: "HydraFacial Deep Glow Session",
                      basePrice: 7500,
                      selectedPrice: 7500,
                      conversationBreadcrumbs: ["Branch: HydraFacial Clinical Glow"],
                    });
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `hf-out-${Date.now()}`,
                        sender: "assistant",
                        text: `🌟 *HydraFacial Clinical Deep Glow Treatment*\n\nMedical-grade 7-step extraction + hydration session hai (Duration: 60 mins). Instant glow aur event readiness ke liye best hai.\n\n• Standard Session: PKR 7,500\n• Clinical Anti-Aging Peptide Serum + LED Light Therapy add-on: PKR 10,000\n\nKonsa option schedule karein?`,
                        timestamp: "09:15 PM",
                        options: [
                          "Standard HydraFacial Session (PKR 7,500)",
                          "HydraFacial + LED Therapy & Peptides (PKR 10,000)",
                        ],
                      },
                    ]);
                  }, 650);
                }}
                className={`w-full text-left p-2.5 rounded-lg border transition-all font-medium flex items-center justify-between ${
                  activeBranch === "branch_hydrafacial"
                    ? "border-[#1CA830] bg-[#1CA830]/10 text-[#052767] dark:text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#071531] dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs text-[#052767] dark:text-white">
                    🌟 HydraFacial Glow & Add-on Serums
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    7-step clinic facial → LED light therapy → slot
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#1CA830]">TEST</span>
              </button>

              {/* Preset 3: Bridal Glam & Upsell */}
              <button
                onClick={() => {
                  setActiveBranch("branch_bridal");
                  setMessages([
                    {
                      id: `br-in-${Date.now()}`,
                      sender: "customer",
                      text: "Assalam o alaikum! December Barat bridal makeup ki booking aur package details chahiye.",
                      timestamp: "11:10 PM",
                    },
                  ]);
                  setIsTyping(true);
                  setTimeout(() => {
                    setIsTyping(false);
                    setSimState({
                      step: "consulting_service_details",
                      activeBranch: "branch_bridal",
                      selectedService: "Signature Bridal Makeup (Barat/Walima)",
                      basePrice: 45000,
                      selectedPrice: 45000,
                      conversationBreadcrumbs: ["Branch: Barat Bridal Glam"],
                    });
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `br-out-${Date.now()}`,
                        sender: "assistant",
                        text: `👰 *Signature Bridal & Wedding Glam Consultation*\n\nMubarak ho! Barat / Walima Signature Bridal package **PKR 45,000** hai.\n\n💎 *Senior Artist Aliya Noor* recommend karti hain:\n• Pre-Bridal HydraFacial Treatment (Wedding se 3 din pehle glass skin ke liye)\n• Bridal Trial & Dupatta Drape Setting Session (PKR 10,000)\n• Bridal Mehndi Artist add-on (PKR 7,000)\n\nKya wedding date lock karein aur consultation slot reserve karein?`,
                        timestamp: "11:10 PM",
                        options: [
                          "Signature Bridal Package (PKR 45,000)",
                          "Full Bridal + Pre-Bridal Glow Bundle (PKR 52,000)",
                          "Pehle Bridal Trial Book Karein (PKR 10,000)",
                        ],
                      },
                    ]);
                  }, 650);
                }}
                className={`w-full text-left p-2.5 rounded-lg border transition-all font-medium flex items-center justify-between ${
                  activeBranch === "branch_bridal"
                    ? "border-[#1CA830] bg-[#1CA830]/10 text-[#052767] dark:text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#071531] dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs text-[#052767] dark:text-white">
                    👰 Barat Bridal Glam & Mehndi Upsell
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    High-ticket PKR 45,000 package → trial & mehndi bundle
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#1CA830]">TEST</span>
              </button>

              {/* Preset 4: Missed Call Outreach */}
              <button
                onClick={() => {
                  setActiveBranch("branch_missed_call");
                  setMessages([
                    {
                      id: `mc-out-${Date.now()}`,
                      sender: "assistant",
                      text: `📞 *WordbitX Missed Call Immediate Follow-up (4 Seconds Trigger)*\n\nAssalam-o-Alaikum! Aap ne abhi ${settings.name} ko call ki thi. Front desk line busy thi — maazrat chahte hain! Kya kisi service ke liye booking ya rate maloom karna hai?`,
                      timestamp: "04:12 PM",
                      options: [
                        "Haircut & Styling Book Karein (PKR 3,500)",
                        "HydraFacial Glow (PKR 7,500)",
                        "Signature Balayage (PKR 16,500)",
                        "Full Rate List Dekhein",
                      ],
                    },
                  ]);
                  setSimState({
                    step: "awaiting_service",
                    conversationBreadcrumbs: ["Trigger: Missed Call Auto-WhatsApp"],
                  });
                }}
                className={`w-full text-left p-2.5 rounded-lg border transition-all font-medium flex items-center justify-between ${
                  activeBranch === "branch_missed_call"
                    ? "border-[#1CA830] bg-[#1CA830]/10 text-[#052767] dark:text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#071531] dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs text-[#052767] dark:text-white">
                    📞 Missed Call Instant WhatsApp Outreach
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Call miss hote hi 4s mein automatic outreach message
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#1CA830]">TEST</span>
              </button>

              {/* Preset 5: Repeat Client Recognition */}
              <button
                onClick={() => {
                  setActiveBranch("repeat_customer");
                  handleSend("Assalam o alaikum, mera naam Ayesha hai");
                }}
                className={`w-full text-left p-2.5 rounded-lg border transition-all font-medium flex items-center justify-between ${
                  activeBranch === "repeat_customer"
                    ? "border-[#1CA830] bg-[#1CA830]/10 text-[#052767] dark:text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#071531] dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs text-[#052767] dark:text-white">
                    ⭐ Repeat Customer Memory Recognition
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    &ldquo;Ayesha Khan&rdquo; recognized → Balayage with Hina recalled
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#1CA830]">TEST</span>
              </button>
            </div>
          </div>

          {/* Voice note simulation card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1CA830] flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" />
                <span>Customer Voice Note Engine</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-[#1CA830]">
                AUDIO AI
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Customer voice note bhejti hai to assistant text summary banata hai (assistant khud voice
              mein baat nahi karta):
            </p>
            <button
              onClick={() => handleVoiceNote()}
              className="w-full py-2.5 rounded-lg text-xs font-bold text-white bg-[#052767] hover:bg-[#0a327d] transition-colors flex items-center justify-center gap-2 shadow-xs active:scale-95"
            >
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulate Voice Note (0:18s) with AI Summary</span>
            </button>
          </div>

          {/* Breadcrumbs trail */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21] text-xs">
            <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1.5">
              Active Conversation Breadcrumbs
            </span>
            <div className="flex flex-wrap gap-1">
              {simState.conversationBreadcrumbs.map((crumb, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#071531] text-slate-700 dark:text-slate-300 text-[10px] font-mono"
                >
                  ✓ {crumb}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Ultra-Realistic iPhone 18 Pro Max 360° Deep Burgundy Simulator */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          <SimulatorPhone
            messages={messages}
            isTyping={isTyping}
            inputText={inputText}
            setInputText={setInputText}
            onSend={handleSend}
            onVoiceNote={handleVoiceNote}
            onReset={resetSimulator}
            ownerOverride={ownerOverride}
            onToggleOverride={toggleOwnerOverride}
          />
        </div>
      </div>
    </section>
  );
}

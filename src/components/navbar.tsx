"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Settings2,
  ShieldCheck,
  Sun,
  Laptop2,
  X,
  Sparkles,
  Home,
  MessageSquareText,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { ViewTab } from "@/types/salon";

const mainItems: { id: ViewTab; label: string; icon: typeof Home | typeof Settings2 }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "simulator", label: "Simulator", icon: MessageSquareText },
  { id: "settings", label: "Settings", icon: Settings2 },
];

export default function Navbar() {
  const { activeTab, setActiveTab, theme, setTheme } = useSalon();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      const target = event.target as Node;
      if (moreRef.current && !moreRef.current.contains(target)) setMoreOpen(false);
      if (themeRef.current && !themeRef.current.contains(target)) setThemeOpen(false);
    };
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  const selectTab = (tab: ViewTab) => {
    setActiveTab(tab);
    setMoreOpen(false);
    setMobileMenuOpen(false);
  };

  const themeIcon = theme === "dark" ? Moon : theme === "system" ? Laptop2 : Sun;
  const ThemeIcon = themeIcon;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-[#030814]/95">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button onClick={() => selectTab("home")} className="group flex min-w-0 items-center gap-2.5 text-left" aria-label="WordbitX home">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#052767] to-[#1CA830] text-sm font-extrabold text-white shadow-md shadow-emerald-900/10 transition-transform group-hover:scale-105">W</span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 leading-none">
              <span className="text-[15px] font-extrabold tracking-tight text-[#052767] dark:text-white">Wordbit<span className="text-[#1CA830]">X</span></span>
              <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 sm:inline-flex dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">SALON RECOVERY</span>
            </span>
            <span className="mt-1 block truncate text-[10px] leading-none text-slate-500 dark:text-slate-400">Software company · Lahore</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {mainItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => selectTab(id)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition ${activeTab === id ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "text-slate-600 hover:bg-slate-100 hover:text-[#052767] dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
          <div className="relative" ref={moreRef}>
            <button onClick={() => { setMoreOpen((open) => !open); setThemeOpen(false); }} aria-expanded={moreOpen} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition ${moreOpen || ["pricing", "tenant-lab"].includes(activeTab) ? "bg-slate-100 text-[#052767] dark:bg-slate-900 dark:text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}>
              More <ChevronDown size={13} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen && <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-[#071531]">
              {([
                ["pricing", "Pricing & plans", Sparkles],
                ["tenant-lab", "Tenant isolation (RLS)", ShieldCheck],
              ] as const).map(([id, label, Icon]) => <button key={id} onClick={() => selectTab(id)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${activeTab === id ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}><Icon size={15} />{label}</button>)}
            </div>}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative" ref={themeRef}>
            <button onClick={() => { setThemeOpen((open) => !open); setMoreOpen(false); }} aria-label={`Theme: ${theme}`} aria-expanded={themeOpen} title={`Theme: ${theme}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 shadow-sm transition hover:border-emerald-300 dark:border-slate-700 dark:bg-[#071531] dark:text-slate-200">
              <ThemeIcon size={15} /> <span className="hidden text-[11px] font-semibold capitalize sm:inline">{theme}</span><ChevronDown size={12} />
            </button>
            {themeOpen && <div className="absolute right-0 top-11 z-50 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-[#071531]">
              {([
                ["light", "Light", Sun],
                ["dark", "Dark", Moon],
                ["system", "System", Laptop2],
              ] as const).map(([value, label, Icon]) => <button key={value} onClick={() => { setTheme(value); setThemeOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition ${theme === value ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}><span className="flex items-center gap-2"><Icon size={14} />{label}</span>{theme === value && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}</button>)}
            </div>}
          </div>
          <Link href="/admin/login" className="hidden items-center gap-1.5 rounded-lg bg-[#052767] px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0a3582] sm:inline-flex"><ShieldCheck size={14} /> Admin</Link>
          <button onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Open menu" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-[#071531] dark:text-slate-200 md:hidden">{mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}</button>
        </div>
      </div>

      {mobileMenuOpen && <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#030814] md:hidden">
        <div className="grid grid-cols-2 gap-1.5">
          {mainItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => selectTab(id)} className={`flex items-center gap-2 rounded-lg px-3 py-3 text-left text-xs font-semibold ${activeTab === id ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300"}`}><Icon size={15} />{label}</button>)}
          <button onClick={() => selectTab("pricing")} className="flex items-center gap-2 rounded-lg px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300"><Sparkles size={15} />Pricing</button>
          <button onClick={() => selectTab("tenant-lab")} className="flex items-center gap-2 rounded-lg px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300"><ShieldCheck size={15} />Security</button>
          <Link href="/admin/login" onClick={() => setMobileMenuOpen(false)} className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-[#052767] px-3 py-3 text-xs font-semibold text-white"><ShieldCheck size={15} />Admin sign in</Link>
        </div>
      </div>}
    </header>
  );
}

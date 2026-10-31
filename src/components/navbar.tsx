"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  FlaskConical,
  Laptop2,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sun,
  Tags,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { ViewTab } from "@/types/salon";

const mainItems: { id: ViewTab | "shop"; label: string; href: string; icon: LucideIcon }[] = [
  { id: "home", label: "Platform", href: "/", icon: Zap },
  { id: "shop", label: "Shop", href: "/products", icon: ShoppingBag },
  { id: "simulator", label: "Demo Chat", href: "/simulator", icon: MessageSquareText },
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings2 },
  { id: "pricing", label: "Pricing", href: "/pricing", icon: Tags },
];

const themeOptions = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Laptop2 },
] as const;

export default function Navbar() {
  const { activeTab, setActiveTab, theme, setTheme } = useSalon();
  const pathname = usePathname();
  const currentTab = pathname.startsWith("/products") ? "shop" : pathname === "/dashboard" ? "dashboard" : pathname === "/" ? "home" : activeTab;
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
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
        setThemeOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenus);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const selectTab = (tab: ViewTab | "shop") => {
    // /dashboard and /products have their own routes, not SalonRecoveryMaster views.
    if (tab !== "dashboard" && tab !== "shop") setActiveTab(tab);
    setMoreOpen(false);
    setMobileMenuOpen(false);
  };
  const ThemeIcon = theme === "dark" ? Moon : theme === "system" ? Laptop2 : Sun;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-[#172540] dark:bg-[#030a19]/95">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-center text-[10px] leading-4 text-slate-600 sm:text-[11px] dark:border-[#172540] dark:bg-[#061126] dark:text-[#a1b1c9]">
        <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5"><FlaskConical size={12} className="text-emerald-600 dark:text-[#69d279]" /> Phase 1 — demo <span aria-hidden="true">·</span> Dashboard &amp; chat <strong className="text-emerald-700 dark:text-[#69d279]">SAMPLE DATA</strong> <span aria-hidden="true">·</span> Shop orders reviewed manually <span className="hidden sm:inline" aria-hidden="true">·</span> <span className="hidden sm:inline">Live WhatsApp Phase 2 (Meta verification ke baad)</span></span>
      </div>
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" onClick={() => selectTab("home")} className="group flex min-w-0 shrink-0 items-center gap-2.5 text-left" aria-label="WordbitX product home">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1ca830] text-white shadow-lg shadow-emerald-900/10 transition-transform group-hover:scale-105"><MessageCircle size={19} fill="currentColor" className="text-white" /><span aria-hidden="true" className="absolute top-[11px] text-[8px] font-extrabold text-[#1ca830]">W</span></span>
          <span className="min-w-0 max-[374px]:hidden">
            <span className="block text-[15px] font-extrabold leading-none tracking-tight text-[#102a50] dark:text-white">Wordbit<span className="text-[#1ca830] dark:text-[#69d279]">X</span></span>
            <span className="mt-1 block text-[8px] font-bold uppercase leading-[1.1] tracking-[.16em] text-slate-500 dark:text-[#99a8c3]">Missed booking<br />recovery</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
          {mainItems.map(({ id, label, href, icon: Icon }) => (
            <Link key={id} href={href} onClick={() => selectTab(id)} aria-current={currentTab === id ? "page" : undefined} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2.5 text-xs font-semibold transition xl:px-3 ${currentTab === id ? "bg-emerald-50 text-emerald-800 dark:bg-[#0b2b20] dark:text-[#79db87]" : "text-slate-600 hover:bg-slate-100 hover:text-[#102a50] dark:text-[#a3b2ca] dark:hover:bg-[#0a1932] dark:hover:text-white"}`}>
              <Icon size={15} /> {label}
            </Link>
          ))}
          <div className="relative" ref={moreRef}>
            <button type="button" onClick={() => { setMoreOpen((open) => !open); setThemeOpen(false); }} aria-label="More navigation" aria-expanded={moreOpen} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-[#a3b2ca] dark:hover:bg-[#0a1932]">
              <MoreHorizontal size={18} />
            </button>
            {moreOpen && <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-[#1a2b4b] dark:bg-[#07142c]">
              <Link href="/security" onClick={() => selectTab("tenant-lab")} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#10213d]"><ShieldCheck size={15} /> Security</Link>
              <Link href="/admin/login" onClick={() => setMoreOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#10213d]"><ShieldCheck size={15} /> Admin sign in</Link>
            </div>}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center rounded-lg border border-slate-200 bg-slate-50 p-1 xl:flex dark:border-[#172b4c] dark:bg-[#07142c]" aria-label="Theme selection">
            {themeOptions.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => setTheme(value)} aria-pressed={theme === value} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${theme === value ? "bg-[#1ca830] text-white" : "text-slate-500 hover:text-[#102a50] dark:text-[#9daec8] dark:hover:text-white"}`}><Icon size={13} />{label}</button>)}
          </div>
          <div className="relative xl:hidden" ref={themeRef}>
            <button type="button" onClick={() => { setThemeOpen((open) => !open); setMoreOpen(false); }} aria-label={`Theme: ${theme}`} aria-expanded={themeOpen} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 transition hover:border-emerald-400 dark:border-[#1a2b4b] dark:bg-[#07142c] dark:text-slate-200"><ThemeIcon size={15} /><ChevronDown size={12} /></button>
            {themeOpen && <div className="absolute right-0 top-11 z-50 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-[#1a2b4b] dark:bg-[#07142c]">
              {themeOptions.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => { setTheme(value); setThemeOpen(false); }} aria-pressed={theme === value} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${theme === value ? "bg-emerald-50 text-emerald-800 dark:bg-[#0b2b20] dark:text-[#79db87]" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#10213d]"}`}><Icon size={14} />{label}</button>)}
            </div>}
          </div>
          <Link href="/admin/login" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#1ca830] px-3 text-xs font-bold text-white transition hover:bg-[#168d2b] sm:px-3.5"><ShieldCheck size={15} /> Admin</Link>
          <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen} aria-controls="public-mobile-menu" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-[#1a2b4b] dark:bg-[#07142c] dark:text-slate-200 lg:hidden">{mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>

      {mobileMenuOpen && <nav id="public-mobile-menu" aria-label="Mobile navigation" className="border-t border-slate-200 bg-white px-4 py-3 dark:border-[#172540] dark:bg-[#030a19] lg:hidden">
        <div className="grid grid-cols-2 gap-1.5">
          {mainItems.map(({ id, label, href, icon: Icon }) => <Link key={id} href={href} onClick={() => selectTab(id)} aria-current={currentTab === id ? "page" : undefined} className={`flex items-center gap-2 rounded-lg px-3 py-3 text-xs font-semibold ${currentTab === id ? "bg-emerald-50 text-emerald-800 dark:bg-[#0b2b20] dark:text-[#79db87]" : "text-slate-600 dark:text-slate-300"}`}><Icon size={15} />{label}</Link>)}
          <Link href="/security" onClick={() => selectTab("tenant-lab")} className="flex items-center gap-2 rounded-lg px-3 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300"><ShieldCheck size={15} />Security</Link>
          <Link href="/admin/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300"><ShieldCheck size={15} />Admin sign in</Link>
        </div>
      </nav>}
    </header>
  );
}

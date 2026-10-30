"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-[#052767] dark:bg-[#030814] dark:text-slate-100">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-[#030814]/95">
          <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6">
            <Link href="/admin/login" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#052767] to-[#1CA830] text-xs font-extrabold text-white">W</span>
              <span><strong className="block text-sm font-extrabold text-[#052767] dark:text-white">Wordbit<span className="text-[#1CA830]">X</span></strong><span className="block text-[9px] leading-none text-slate-500">Salon admin workspace</span></span>
            </Link>
            <div className="flex items-center gap-3"><span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 sm:inline-flex"><ShieldCheck size={12}/> Secure login</span><Link href="/" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300"><ArrowLeft size={13}/> Public site</Link></div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-[#052767] transition-colors dark:bg-[#030814] dark:text-slate-100">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";
import { WORDBITX_COMPANY } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#030814] text-slate-600 dark:text-slate-400 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs">
        {/* Brand Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1CA830] to-[#052767] flex items-center justify-center font-bold text-white text-sm">
              W
            </div>
            <span className="text-base font-bold text-[#052767] dark:text-white">
              WordbitX
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Registered Software Development Company in Lahore, Pakistan. Building
            enterprise-grade recovery and automation engines for retail brands and salons.
          </p>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#1CA830]" />
            <span>Lahore, Pakistan & New York, USA</span>
          </div>
        </div>

        {/* Architecture Navigation */}
        <div className="space-y-2.5">
          <div className="font-bold uppercase tracking-wider text-[#052767] dark:text-white">
            Core Architecture
          </div>
          <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
            <li><Link href="/products" className="hover:text-[#1CA830] transition-colors">Salon products &amp; shop</Link></li>
            <li>
              <Link
                href="/simulator"
                className="hover:text-[#1CA830] transition-colors"
              >
                Missed Call Recovery Engine
              </Link>
            </li>
            <li>
              <Link
                href="/simulator"
                className="hover:text-[#1CA830] transition-colors"
              >
                Off-Hours WhatsApp Auto-Slotted Booking
              </Link>
            </li>
            <li>
              <Link
                href="/simulator"
                className="hover:text-[#1CA830] transition-colors"
              >
                Stylist Loyalty Routing (&ldquo;Hina se hi&rdquo;)
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard"
                className="hover:text-[#1CA830] transition-colors"
              >
                Waitlist Cancellation Backfill
              </Link>
            </li>
            <li>
              <Link
                href="/security"
                className="hover:text-[#1CA830] transition-colors"
              >
                Supabase RLS Tenant Isolation
              </Link>
            </li>
            <li>
              <Link
                href="/pricing"
                className="hover:text-[#1CA830] transition-colors"
              >
                Meta Graph API v21 Webhooks
              </Link>
            </li>
          </ul>
        </div>

        {/* Company SLA & Support */}
        <div className="space-y-2.5">
          <div className="font-bold uppercase tracking-wider text-[#052767] dark:text-white">
            WordbitX Company SLA
          </div>
          <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
            <li>• 24 Ghante Mein Setup SLA</li>
            <li>• Dedicated Lahore Engineering Desk</li>
            <li>• Monthly Verified Recovery Audit</li>
            <li>• Human Takeover Override Protocol</li>
            <li>• Verified CSV Data Exports</li>
            <li>• Zero Cold Spam Messaging Guarantee</li>
          </ul>
        </div>

        {/* Official Channels */}
        <div className="space-y-2.5">
          <div className="font-bold uppercase tracking-wider text-[#052767] dark:text-white">
            Direct Office Lines
          </div>
          <div className="space-y-2 text-slate-600 dark:text-slate-400">
            <p>
              Email:{" "}
              <a
                href={`mailto:${WORDBITX_COMPANY.email}`}
                className="font-bold text-[#1CA830] hover:underline"
              >
                {WORDBITX_COMPANY.email}
              </a>
            </p>
            <p>
              PK Phone:{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {WORDBITX_COMPANY.phonePK}
              </strong>
            </p>
            <p>
              USA Line:{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {WORDBITX_COMPANY.phoneUSA}
              </strong>
            </p>
            <p>
              Official Website:{" "}
              <a
                href={WORDBITX_COMPANY.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#1CA830] font-bold inline-flex items-center gap-1 hover:underline"
              >
                <span>{WORDBITX_COMPANY.website}</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
        <div>
          © {new Date().getFullYear()} WordbitX (Private) Limited · Software Development Company ·
          Lahore, Pakistan.
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Meta Cloud API & Supabase Architecture</span>
          </span>
          <span>·</span>
          <span>Sample Data Clearly Labelled</span>
        </div>
      </div>
    </footer>
  );
}

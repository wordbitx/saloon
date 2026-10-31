"use client";

import { useState } from "react";
import { Copy, ExternalLink, Globe, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useWorkspaces } from "@/context/workspace-context";

/** Explicit opt-in: no existing salon is accidentally made public. */
export default function WebsiteBookingControls() {
  const { can, demo } = useAuth();
  const { activeWorkspace, setPublicBookingEnabled } = useWorkspaces();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  if (demo) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Public sample dashboard par website bookings receive nahi hoti. Owner sign-in mein booking request link alag se enable kiya ja sakta hai.</p>;
  if (!can("registry.manage")) return null;
  const enabled = activeWorkspace.publicBookingEnabled === true;
  const path = `/book/${encodeURIComponent(activeWorkspace.id)}`;
  const toggle = async () => {
    if (saving) return;
    setSaving(true); setNotice("");
    const result = await setPublicBookingEnabled(!enabled);
    setSaving(false);
    if (!result.ok) setNotice(result.message ?? "Setting save nahi hui.");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}${path}`); setNotice("Booking link copy ho gaya."); }
    catch { setNotice("Copy nahi hua. Open link karke browser se copy karein."); }
  };
  return <section className="rounded-2xl border border-emerald-200 bg-white p-4 dark:border-emerald-900/60 dark:bg-[#050d21]">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400"><Globe size={12} /> Owner setup · website requests</span><h3 className="mt-1 text-sm font-bold text-[#052767] dark:text-white">Public appointment request link</h3><p className="mt-1 max-w-xl text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Link enable aur website par share karein. Requests is salon ki Waitlist mein pending aayengi; staff slot check karke confirm karega. Koi WhatsApp / SMS automatically send nahi hota.</p></div><button type="button" disabled={saving} onClick={() => void toggle()} className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold disabled:opacity-60 ${enabled ? "border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300" : "bg-[#1CA830] text-white"}`}>{saving && <Loader2 size={12} className="animate-spin" />}{enabled ? "Disable booking link" : "Enable booking link"}</button></div>
    {enabled && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900"><code className="min-w-0 flex-1 break-all text-[10px] text-slate-600 dark:text-slate-300">{path}</code><button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Copy size={12} /> Copy link</button><a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><ExternalLink size={12} /> Open form</a></div>}
    {notice && <p role="status" className="mt-2 text-[10px] font-semibold text-slate-500">{notice}</p>}
    <p className="mt-2 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">Demo/prototype: public use se pehle durable database, backups, privacy controls aur production abuse protection zaroori hain.</p>
  </section>;
}

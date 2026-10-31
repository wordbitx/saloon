"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { karachiToday } from "@/lib/booking-schedule";

type Salon = {
  id: string; name: string; city: string;
  branches: { id: string; name: string; area: string }[];
  services: { id: string; name: string; durationMinutes: number; pricePKR: number }[];
};
const input = "mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const label = "block text-[11px] font-bold text-slate-600 dark:text-slate-300";

export default function BookingRequestForm({ salon }: { salon: Salon }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState(salon.branches[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(salon.services[0]?.id ?? "");
  const [date, setDate] = useState(karachiToday);
  const [time, setTime] = useState("11:00");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError(""); setSaving(true);
    try {
      const response = await fetch(`/api/public/booking/${encodeURIComponent(salon.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: name, customerPhone: phone, branchId, serviceId, preferredDate: date, preferredTime: time, consent, website }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ?? "Request send nahi hui. Dobara try karein."); return; }
      setSent(true);
    } catch { setError("Connection nahi bana. Dobara try karein."); }
    finally { setSaving(false); }
  };
  if (sent) return <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"><CheckCircle2 size={22} /><h2 className="mt-2 text-base font-extrabold">Request bhej di gayi</h2><p className="mt-1 text-xs leading-relaxed">{salon.name} isay review karke aapse manually rabta karega. Ye abhi confirmed appointment nahi hai; koi automatic message nahi bheja gaya.</p></div>;
  return <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
    {salon.services.length === 0 && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Salon ka service menu abhi available nahi hai. Salon se directly rabta karein.</p>}
    <label className={label}>Aapka naam<input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={input} /></label>
    <label className={label}>Phone number<input required maxLength={30} type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="03xx xxxxxxx" className={input} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className={label}>Branch<select required value={branchId} onChange={(event) => setBranchId(event.target.value)} className={input}>{salon.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.area ? ` · ${branch.area}` : ""}</option>)}</select></label><label className={label}>Service<select required value={serviceId} onChange={(event) => setServiceId(event.target.value)} className={input}>{salon.services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} min · PKR {service.pricePKR.toLocaleString("en-PK")}</option>)}</select></label></div>
    <div className="grid grid-cols-2 gap-4"><label className={label}>Preferred date<input required type="date" min={karachiToday()} value={date} onChange={(event) => setDate(event.target.value)} className={input} /></label><label className={label}>Preferred time<input required type="time" value={time} onChange={(event) => setTime(event.target.value)} className={input} /></label></div>
    <div className="hidden" aria-hidden="true"><label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label></div>
    <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300"><input required type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 accent-emerald-600" /> <span>Main salon ko is request ke bare mein phone par contact karne ki permission deta/deti hoon.</span></label>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    <button type="submit" disabled={saving || !salon.services.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1CA830] px-4 py-3 text-sm font-bold text-white hover:bg-[#178e29] disabled:opacity-50">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? "Sending…" : "Send appointment request"}</button>
  </form>;
}

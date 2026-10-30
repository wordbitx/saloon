"use client";

import React, { useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  ImagePlus,
  Images,
  Loader2,
  MapPin,
  Phone,
  Scissors,
  Store,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { RegisteredSalon, RegisteredSalonImage, SalonImageKind, SAMPLE_REGISTERED_SALONS } from "@/types/registry";
import { useSalon } from "@/context/salon-context";

const MAX_FILE_BYTES = 1_500_000;

const imageKindLabels: { value: SalonImageKind; label: string }[] = [
  { value: "logo", label: "Logo" },
  { value: "interior", label: "Salon interior" },
  { value: "team", label: "Team / staff" },
  { value: "service", label: "Service work" },
  { value: "other", label: "Other" },
];

export default function SalonRegistry() {
  const { showToast } = useSalon();
  const [salons, setSalons] = useState<RegisteredSalon[]>(SAMPLE_REGISTERED_SALONS);
  const [selectedId, setSelectedId] = useState<string>(SAMPLE_REGISTERED_SALONS[0]?.id ?? "");
  const [draft, setDraft] = useState<RegisteredSalon | null>(SAMPLE_REGISTERED_SALONS[0] ?? null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKind = useRef<SalonImageKind>("interior");

  const selected = salons.find((s) => s.id === selectedId) ?? null;

  const updateDraft = (patch: Partial<RegisteredSalon>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Sirf image files (JPG, PNG, WebP) upload ho sakti hain.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showToast("Image 1.5 MB se choti honi chahiye.");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const image: RegisteredSalonImage = {
        id: `img-${Date.now()}`,
        name: file.name,
        kind: pendingKind.current,
        dataUrl: String(reader.result),
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      };
      updateDraft({ images: [...(draft?.images ?? []), image] });
      setUploading(false);
      showToast(`Image upload ho gayi: ${file.name} (preview session).`);
    };
    reader.onerror = () => {
      setUploading(false);
      showToast("Image read nahi ho saki. Dobara try karein.");
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (imageId: string) => {
    updateDraft({ images: (draft?.images ?? []).filter((image) => image.id !== imageId) });
  };

  const saveSalon = () => {
    if (!draft) return;
    if (!draft.salonName.trim()) {
      showToast("Salon ka naam zaroori hai.");
      return;
    }
    const exists = salons.some((s) => s.id === draft.id);
    const saved: RegisteredSalon = { ...draft, status: "submitted" };
    setSalons((current) => (exists ? current.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...current]));
    setSelectedId(saved.id);
    showToast(`${saved.salonName} ka profile save ho gaya (${saved.images.length} image(s)).`);
  };

  const registerNewSalon = () => {
    const fresh: RegisteredSalon = {
      id: `salon-reg-${Date.now()}`,
      salonName: "New Salon, Lahore",
      ownerName: "",
      phone: "",
      whatsapp: "",
      email: "",
      city: "Lahore",
      area: "",
      address: "",
      branches: [{ name: "Main Branch", area: "" }],
      staff: [],
      services: [],
      openingTime: "11:00 AM",
      closingTime: "09:00 PM",
      offDays: ["Monday"],
      googleReviewUrl: "",
      images: [],
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    setSalons((current) => [fresh, ...current]);
    setSelectedId(fresh.id);
    setDraft(fresh);
    showToast("Naya salon draft ban gaya — details aur images bhar dein.");
  };

  return (
    <div className="space-y-5">
      {/* Registry list + form */}
      <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
        {/* Registered salons */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">Salon registry</span>
              <h3 className="mt-1 text-base font-bold text-[#052767] dark:text-white">Registered salons</h3>
            </div>
            <button
              onClick={registerNewSalon}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1CA830] px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-[#178e29] active:scale-95"
            >
              <UserPlus size={12} /> New salon
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {salons.map((salon) => (
              <button
                key={salon.id}
                onClick={() => {
                  setSelectedId(salon.id);
                  setDraft(salon);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                  selectedId === salon.id
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-slate-100 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                {salon.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={salon.images[0].dataUrl} alt={salon.salonName} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800"><Store size={16} /></span>
                )}
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[11px] text-slate-800 dark:text-white">{salon.salonName}</strong>
                  <span className="block truncate text-[9px] text-slate-500">{salon.area || "Area add karein"} · {salon.branches.length} branch(es)</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase ${salon.status === "submitted" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>
                  {salon.status}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Salon detail form */}
        {draft ? (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">
                  <Store size={12} /> Salon registration form
                </span>
                <h3 className="mt-1 text-base font-bold text-[#052767] dark:text-white">{draft.salonName}</h3>
              </div>
              <button onClick={saveSalon} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1CA830] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#178e29] active:scale-95">
                <Check size={13} /> Save profile
              </button>
            </div>

            {/* Business details */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Salon name<input value={draft.salonName} onChange={(e) => updateDraft({ salonName: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Owner / manager name<input value={draft.ownerName} onChange={(e) => updateDraft({ ownerName: e.target.value })} placeholder="Aap ka naam" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Phone<input value={draft.phone} onChange={(e) => updateDraft({ phone: e.target.value })} placeholder="0300-XXXXXXX" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">WhatsApp number<input value={draft.whatsapp} onChange={(e) => updateDraft({ whatsapp: e.target.value })} placeholder="WhatsApp par chalega" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Email<input type="email" value={draft.email} onChange={(e) => updateDraft({ email: e.target.value })} placeholder="salon@example.com" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Area / sector<input value={draft.area} onChange={(e) => updateDraft({ area: e.target.value })} placeholder="DHA Phase 5, Lahore" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">Full address<input value={draft.address} onChange={(e) => updateDraft({ address: e.target.value })} placeholder="Plot / street / landmark" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Opening time<input value={draft.openingTime} onChange={(e) => updateDraft({ openingTime: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Closing time<input value={draft.closingTime} onChange={(e) => updateDraft({ closingTime: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">Weekly off-days (comma separated)<input value={draft.offDays.join(", ")} onChange={(e) => updateDraft({ offDays: e.target.value.split(",").map((d) => d.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">Google review link<input value={draft.googleReviewUrl} onChange={(e) => updateDraft({ googleReviewUrl: e.target.value })} placeholder="https://g.page/..." className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
            </div>

            {/* Branches */}
            <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#052767] dark:text-white"><Building2 size={12} className="text-[#1CA830]" /> Branches</span>
                <button onClick={() => updateDraft({ branches: [...draft.branches, { name: "New Branch", area: "" }] })} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">+ Branch</button>
              </div>
              <div className="mt-2 space-y-2">
                {draft.branches.map((branch, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input value={branch.name} onChange={(e) => updateDraft({ branches: draft.branches.map((b, i) => (i === index ? { ...b, name: e.target.value } : b)) })} placeholder="Branch name" className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    <input value={branch.area} onChange={(e) => updateDraft({ branches: draft.branches.map((b, i) => (i === index ? { ...b, area: e.target.value } : b)) })} placeholder="Area" className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    <button onClick={() => updateDraft({ branches: draft.branches.filter((_, i) => i !== index) })} className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff */}
            <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#052767] dark:text-white"><Users size={12} className="text-[#1CA830]" /> Staff / stylists</span>
                <button onClick={() => updateDraft({ staff: [...draft.staff, { name: "", specialty: "" }] })} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">+ Staff</button>
              </div>
              <div className="mt-2 space-y-2">
                {draft.staff.map((staff, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input value={staff.name} onChange={(e) => updateDraft({ staff: draft.staff.map((s, i) => (i === index ? { ...s, name: e.target.value } : s)) })} placeholder="Stylist name" className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    <input value={staff.specialty} onChange={(e) => updateDraft({ staff: draft.staff.map((s, i) => (i === index ? { ...s, specialty: e.target.value } : s)) })} placeholder="Specialty" className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    <button onClick={() => updateDraft({ staff: draft.staff.filter((_, i) => i !== index) })} className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                  </div>
                ))}
                {draft.staff.length === 0 && <p className="text-[10px] text-slate-400">Abhi koi stylist add nahi hua.</p>}
              </div>
            </div>

            {/* Services */}
            <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#052767] dark:text-white"><Scissors size={12} className="text-[#1CA830]" /> Services & prices</span>
                <button onClick={() => updateDraft({ services: [...draft.services, { name: "", category: "Hair", pricePKR: 0, durationMinutes: 60 }] })} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">+ Service</button>
              </div>
              <div className="mt-2 space-y-2">
                {draft.services.map((service, index) => (
                  <div key={index} className="grid grid-cols-12 items-center gap-2">
                    <input value={service.name} onChange={(e) => updateDraft({ services: draft.services.map((s, i) => (i === index ? { ...s, name: e.target.value } : s)) })} placeholder="Service" className="col-span-4 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    <select value={service.category} onChange={(e) => updateDraft({ services: draft.services.map((s, i) => (i === index ? { ...s, category: e.target.value } : s)) })} className="col-span-3 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option>Hair</option><option>Skin & Facial</option><option>Makeup & Bridal</option><option>Nails</option></select>
                    <input type="number" value={service.pricePKR} onChange={(e) => updateDraft({ services: draft.services.map((s, i) => (i === index ? { ...s, pricePKR: Number(e.target.value) } : s)) })} placeholder="PKR" className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    <input type="number" value={service.durationMinutes} onChange={(e) => updateDraft({ services: draft.services.map((s, i) => (i === index ? { ...s, durationMinutes: Number(e.target.value) } : s)) })} placeholder="mins" className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    <button onClick={() => updateDraft({ services: draft.services.filter((_, i) => i !== index) })} className="col-span-1 rounded-lg p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                  </div>
                ))}
                {draft.services.length === 0 && <p className="text-[10px] text-slate-400">Services add karein taake assistant exact rates de sake.</p>}
              </div>
            </div>

            {/* Images */}
            <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#052767] dark:text-white"><Images size={12} className="text-[#1CA830]" /> Salon images</span>
                <span className="text-[9px] text-slate-400">{draft.images.length} uploaded</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  onChange={(e) => { pendingKind.current = e.target.value as SalonImageKind; }}
                  defaultValue="interior"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {imageKindLabels.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
                </select>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 dark:bg-emerald-950/30 dark:text-emerald-300"
                >
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Image upload karein
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleFile(file);
                    event.target.value = "";
                  }}
                />
                <span className="text-[9px] text-slate-400">JPG / PNG / WebP · max 1.5 MB</span>
              </div>

              {draft.images.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {draft.images.map((image) => (
                    <figure key={image.id} className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.dataUrl} alt={image.name} className="h-24 w-full object-cover" />
                      <figcaption className="bg-white p-2 dark:bg-slate-900">
                        <span className="block truncate text-[9px] font-bold text-slate-700 dark:text-slate-200">{image.name}</span>
                        <span className="mt-0.5 block text-[8px] uppercase tracking-wider text-slate-400">
                          {imageKindLabels.find((k) => k.value === image.kind)?.label} · {Math.round(image.sizeBytes / 1024)} KB
                        </span>
                      </figcaption>
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-rose-500 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="Remove image"
                      >
                        <X size={11} />
                      </button>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
                  <ImagePlus size={20} className="text-slate-300" />
                  <p className="text-[11px] font-semibold text-slate-500">Koi image upload nahi hui</p>
                  <p className="text-[10px] text-slate-400">Logo, salon interior aur team photos add karein — dashboard preview mein use honge.</p>
                </div>
              )}

              <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-[10px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                SAMPLE MODE: images sirf is browser session mein rehti hain. Production mein Supabase Storage bucket aur signed upload URLs chahiye honge — TODO (owner decision).
              </p>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#050d21]">
            Koi salon select karein ya naya salon register karein.
          </section>
        )}
      </div>
    </div>
  );
}

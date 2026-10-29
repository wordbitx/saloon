"use client";

import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  Images,
  Upload,
  Trash2 as TrashIcon,
  Loader2,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { Service, ServiceCategory } from "@/types/salon";

export default function SettingsView() {
  const { settings, updateSettings, resetSettings, setActiveTab } = useSalon();

  const [name, setName] = useState(settings.name);
  const [area, setArea] = useState(settings.area);
  const [address, setAddress] = useState(settings.address);
  const [openingTime, setOpeningTime] = useState(settings.openingTime);
  const [closingTime, setClosingTime] = useState(settings.closingTime);
  const [offDays, setOffDays] = useState(settings.offDays.join(", "));
  const [greetingMessage, setGreetingMessage] = useState(settings.greetingMessage);
  const [services, setServices] = useState<Service[]>(settings.services);
  const [stylistsText, setStylistsText] = useState(
    settings.stylists.map((s) => s.name).join(", ")
  );
  const [branchesText, setBranchesText] = useState(
    settings.branches.map((b) => b.name).join(", ")
  );

  const [profileImages, setProfileImages] = useState<{ id: string; name: string; kind: string; dataUrl: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageKind, setImageKind] = useState("interior");
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const handleProfileImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Sirf image files (JPG, PNG, WebP) upload kar sakte hain.");
      return;
    }
    if (file.size > 1_500_000) {
      alert("Image 1.5 MB se choti honi chahiye.");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setProfileImages((current) => [
        ...current,
        { id: `img-${Date.now()}`, name: file.name, kind: imageKind, dataUrl: String(reader.result) },
      ]);
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  };

  const categories: ServiceCategory[] = [
    "Hair",
    "Skin & Facial",
    "Makeup & Bridal",
    "Nails",
  ];

  const handleAddService = () => {
    const newService: Service = {
      id: `srv-${Date.now()}`,
      name: "New Salon Treatment",
      category: "Hair",
      durationMinutes: 60,
      pricePKR: 4500,
      description: "Custom salon treatment added in settings.",
    };
    setServices([...services, newService]);
  };

  const handleUpdateService = (id: string, field: keyof Service, val: any) => {
    setServices(
      services.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const handleDeleteService = (id: string) => {
    if (services.length <= 1) {
      alert("At least 1 service is required for the booking engine.");
      return;
    }
    setServices(services.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    const offDaysArray = offDays
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const stylists = stylistsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, idx) => ({
        id: `sty-${idx + 1}`,
        name,
        specialty: "Senior Specialist",
        availableDays: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      }));

    const branches = branchesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, idx) => ({
        id: `br-${idx + 1}`,
        name,
        area: idx === 0 ? "Flagship Location, Lahore" : "Lahore Branch",
      }));

    updateSettings({
      name,
      area,
      address,
      openingTime,
      closingTime,
      offDays: offDaysArray.length > 0 ? offDaysArray : ["Monday"],
      greetingMessage,
      services,
      stylists: stylists.length > 0 ? stylists : settings.stylists,
      branches: branches.length > 0 ? branches : settings.branches,
    });
  };

  return (
    <section id="settings" className="py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1CA830] uppercase tracking-wider mb-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Salon Configuration Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#052767] dark:text-white">
            Editable Salon Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Salon ka naam, area, services + prices aur timings badalney par <b>chat aur dashboard foran khud badal jayenge</b>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={resetSettings}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#050d21] border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1CA830] hover:bg-[#178e29] shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save & Live Sync</span>
          </button>
        </div>
      </div>

      {/* Card 1: Salon Profile */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#050d21] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-[#052767] dark:text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#1CA830]" />
          <span>Basic Profile & Timings</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Salon Name (Brand) *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1CA830]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Primary Area / Sector *
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1CA830]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Opening Time
            </label>
            <input
              type="text"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1CA830]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Closing Time
            </label>
            <input
              type="text"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1CA830]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Weekly Off-Days (comma-separated)
            </label>
            <input
              type="text"
              value={offDays}
              onChange={(e) => setOffDays(e.target.value)}
              placeholder="e.g. Monday"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1CA830]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Automated WhatsApp Greeting Template (Roman Urdu)
            </label>
            <textarea
              rows={2}
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1CA830]"
            />
          </div>
        </div>
      </div>

      {/* Card 2: Services & Price List */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#050d21] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#052767] dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#1CA830]" />
              <span>Services & Price List (PKR)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Customer jab rate poochti hai to assistant is verified price list se exact rate aur duration batata hai:
            </p>
          </div>
          <button
            onClick={handleAddService}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-[#1CA830] hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Service</span>
          </button>
        </div>

        <div className="space-y-3">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#071531]/50 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
            >
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                  Service Name
                </label>
                <input
                  type="text"
                  value={svc.name}
                  onChange={(e) => handleUpdateService(svc.id, "name", e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#050d21] font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Category</label>
                <select
                  value={svc.category}
                  onChange={(e) =>
                    handleUpdateService(svc.id, "category", e.target.value as ServiceCategory)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#050d21] text-slate-900 dark:text-white"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Price (PKR)</label>
                <input
                  type="number"
                  value={svc.pricePKR}
                  onChange={(e) => handleUpdateService(svc.id, "pricePKR", Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#050d21] font-bold text-[#1CA830]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Mins</label>
                <input
                  type="number"
                  value={svc.durationMinutes}
                  onChange={(e) =>
                    handleUpdateService(svc.id, "durationMinutes", Number(e.target.value))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#050d21] text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-1 flex justify-end">
                <button
                  onClick={() => handleDeleteService(svc.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                  title="Delete service"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card 3: Branches & Stylists */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#050d21] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-[#052767] dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-[#1CA830]" />
          <span>Branches & Stylist Team Routing</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Branches (comma-separated)
            </label>
            <input
              type="text"
              value={branchesText}
              onChange={(e) => setBranchesText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1CA830]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Senior Stylists (comma-separated)
            </label>
            <input
              type="text"
              value={stylistsText}
              onChange={(e) => setStylistsText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1CA830]"
            />
          </div>
        </div>
      </div>

      {/* Card 4: Salon profile images */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#050d21] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-[#052767] dark:text-white flex items-center gap-2">
              <Images className="w-4 h-4 text-[#1CA830]" />
              <span>Salon profile images</span>
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Logo, salon interior, team aur service work ki photos upload karein — profile aur dashboard mein use hongi.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">Sample session</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select value={imageKind} onChange={(e) => setImageKind(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#071531] px-2.5 py-2 text-[11px]">
            <option value="logo">Logo</option>
            <option value="interior">Salon interior</option>
            <option value="team">Team / staff</option>
            <option value="service">Service work</option>
          </select>
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 dark:bg-emerald-950/30 dark:text-emerald-300">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Image upload karein
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleProfileImage(file); event.target.value = ""; }} />
          <span className="text-[10px] text-slate-400">JPG / PNG / WebP · max 1.5 MB</span>
        </div>

        {profileImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {profileImages.map((image) => (
              <figure key={image.id} className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.dataUrl} alt={image.name} className="h-24 w-full object-cover" />
                <figcaption className="bg-white p-2 dark:bg-slate-900">
                  <span className="block truncate text-[9px] font-bold text-slate-700 dark:text-slate-200">{image.name}</span>
                  <span className="mt-0.5 block text-[8px] uppercase tracking-wider text-slate-400">{image.kind}</span>
                </figcaption>
                <button type="button" onClick={() => setProfileImages((current) => current.filter((row) => row.id !== image.id))} className="absolute right-1.5 top-1.5 rounded-full bg-rose-500 p-1 text-white opacity-0 transition group-hover:opacity-100" aria-label="Remove image">
                  <TrashIcon className="w-3 h-3" />
                </button>
              </figure>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center dark:border-slate-700">
            <Images className="mx-auto w-5 h-5 text-slate-300" />
            <p className="mt-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Koi salon image upload nahi hui</p>
            <p className="text-[10px] text-slate-400">Sample imagery already dashboard aur home page par use ho rahi hai.</p>
          </div>
        )}

        <p className="rounded-lg bg-amber-50 p-2.5 text-[10px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Images sirf is browser session mein rehti hain. Production uploads ke liye Supabase Storage bucket chahiye — TODO (owner decision).
        </p>
      </div>

      {/* Bottom Save Action Bar */}
      <div className="p-4 rounded-2xl bg-[#052767] text-white flex items-center justify-between shadow-xl">
        <span className="text-xs font-semibold">
          Save karne ke baad Live Simulator ya Dashboard mein test karein.
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("simulator")}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            Test in Simulator →
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#1CA830] hover:bg-[#178e29] text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
          >
            Save & Live Sync
          </button>
        </div>
      </div>
    </section>
  );
}

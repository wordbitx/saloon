"use client";

/* Uploaded data URLs are intentionally rendered locally, not sent to an image optimizer. */
/* eslint-disable @next/next/no-img-element */

import { useState, type FormEvent } from "react";
import { ArrowRight, Building2, Camera, Check, ImagePlus, Plus, Scissors, Store, Trash2, Users } from "lucide-react";
import { useWorkspaces } from "@/context/workspace-context";
import { newWorkspaceProfile, type SalonWorkspace, type WorkspaceProfile } from "@/lib/workspaces/model";
import type { SalonImageKind } from "@/types/registry";
import type { ServiceCategory } from "@/types/salon";

const field = "mt-1 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const label = "block min-w-0 text-[11px] font-semibold text-slate-600 dark:text-slate-300";
const secondary = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-200";
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const profileOf = (workspace: SalonWorkspace): WorkspaceProfile => structuredClone({ id: workspace.id, profileVersion: workspace.profileVersion ?? 1, settings: workspace.settings, ownerName: workspace.ownerName, email: workspace.email, whatsapp: workspace.whatsapp, images: workspace.images });

/** Resize images before placing them in the workspace document; strip file metadata. */
async function resizedImage(file: File): Promise<string> {
  if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(file.type)) throw new Error("Sirf JPG, PNG ya WebP photo chunein.");
  if (file.size > 8_000_000) throw new Error("Photo 8 MB se choti honi chahiye.");
  const source = URL.createObjectURL(file);
  try {
    const img = new window.Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Photo read nahi ho saki.")); img.src = source; });
    const scale = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Photo resize nahi hui.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/webp", 0.72);
    if (data.length > 350_000) throw new Error("Photo bohat bari hai — choti image try karein.");
    return data;
  } finally { URL.revokeObjectURL(source); }
}

export default function SalonRegistry({ onViewDashboard }: { onViewDashboard: () => void }) {
  const { workspaces, activeWorkspace, selectWorkspace, saveProfile, removeWorkspace, demo } = useWorkspaces();
  const [draft, setDraft] = useState<WorkspaceProfile>(() => profileOf(activeWorkspace));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [imageKind, setImageKind] = useState<SalonImageKind>("interior");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const exists = workspaces.some((workspace) => workspace.id === draft.id);

  const changeSettings = (patch: Partial<WorkspaceProfile["settings"]>) => setDraft((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setNotice(""); setSaving(true);
    try {
      const saved = await saveProfile(draft);
      setDraft(profileOf(saved));
      setNotice(`${saved.settings.name} save ho gaya. Overview se salon aur branch switch kar sakte hain.`);
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Save nahi hua."); }
    finally { setSaving(false); }
  };
  const select = (workspace: SalonWorkspace) => {
    setDraft(profileOf(workspace)); setError(""); setNotice(""); setDeleteConfirm(false);
  };
  const addNew = () => {
    setDraft(newWorkspaceProfile(uid("salon"))); setError(""); setNotice(""); setDeleteConfirm(false);
  };
  const remove = async () => {
    setSaving(true); setError("");
    try {
      await removeWorkspace(draft.id);
      const next = workspaces.find((workspace) => workspace.id !== draft.id);
      if (next) setDraft(profileOf(next));
      setDeleteConfirm(false); setNotice("Salon delete ho gaya. Assigned staff logins ko doosra salon assign karein.");
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Delete nahi hua."); }
    finally { setSaving(false); }
  };
  const deleteBranch = (branchId: string) => {
    const branches = draft.settings.branches;
    if (branches.length <= 1) { setError("Kam az kam ek branch zaroori hai."); return; }
    const branch = branches.find((item) => item.id === branchId);
    if (!window.confirm(`${branch?.name ?? "Branch"} delete karein? Save karne par is branch ki bookings, waitlist, customer records aur branch closures bhi permanently delete honge. Staff unassigned ho jayega.`)) return;
    const next = branches.filter((item) => item.id !== branchId);
    changeSettings({ branches: next, activeBranchId: next[0].id, stylists: draft.settings.stylists.map((person) => person.branchId === branchId ? { ...person, branchId: undefined } : person) });
    setNotice("Branch remove ho gayi; permanent change ke liye Save salon dabayein.");
  };
  const uploadStaff = async (staffId: string, file: File) => {
    setPhotoBusy(true); setError("");
    try {
      const photoDataUrl = await resizedImage(file);
      setDraft((current) => ({ ...current, settings: { ...current.settings, stylists: current.settings.stylists.map((person) => person.id === staffId ? { ...person, photoDataUrl } : person) } }));
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Photo upload nahi hui."); }
    finally { setPhotoBusy(false); }
  };
  const uploadSalon = async (file: File) => {
    setPhotoBusy(true); setError("");
    try {
      const dataUrl = await resizedImage(file);
      setDraft((current) => ({ ...current, images: [...current.images, { id: uid("image"), name: file.name.slice(0, 160), kind: imageKind, dataUrl, sizeBytes: file.size, uploadedAt: new Date().toISOString() }] }));
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Image upload nahi hui."); }
    finally { setPhotoBusy(false); }
  };

  return <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
    <section className="h-fit rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]">
      <div className="flex items-center justify-between gap-2"><div><p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Your salons</p><h3 className="mt-1 text-sm font-bold text-[#052767] dark:text-white">Salon registry</h3></div><button type="button" onClick={addNew} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-2 text-[10px] font-bold text-white"><Plus size={13} /> New salon</button></div>
      <div className="mt-3 space-y-2">{workspaces.map((workspace) => <button type="button" key={workspace.id} onClick={() => select(workspace)} className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left ${draft.id === workspace.id ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-100 hover:border-slate-300 dark:border-slate-800"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-emerald-700 dark:bg-slate-800 dark:text-emerald-300"><Store size={16} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-slate-800 dark:text-white">{workspace.settings.name}</strong><span className="block text-[9px] text-slate-500">{workspace.settings.branches.length} branches · {workspace.settings.stylists.length} staff</span></span>{workspace.isSample && <span className="text-[8px] font-bold uppercase text-amber-700 dark:text-amber-300">Sample</span>}</button>)}
        {!exists && <div className="rounded-xl border border-dashed border-emerald-400 bg-emerald-50 p-3 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">New salon · unsaved draft</div>}
      </div>
      <p className="mt-4 text-[10px] leading-relaxed text-slate-500">{demo ? "Public demo changes are temporary and separate from the admin panel." : "Salons ko Overview se switch karein. Staff logins Team access mein assign hote hain."}</p>
    </section>

    <form onSubmit={save} className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"><div><p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Salon profile · {exists ? "edit" : "new"}</p><h3 className="mt-1 text-lg font-bold text-[#052767] dark:text-white">{draft.settings.name || "Naya salon"}</h3><p className="mt-1 text-[10px] text-slate-500">Changes save karne ke baad dashboard mein nazar aayengi.</p></div><div className="flex flex-wrap gap-2">{exists && <button type="button" onClick={() => { selectWorkspace(draft.id); onViewDashboard(); }} className={secondary}>View dashboard <ArrowRight size={12} /></button>}<button type="submit" disabled={saving || photoBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-[11px] font-bold text-white disabled:opacity-50"><Check size={14} /> {saving ? "Saving…" : "Save salon"}</button></div></div>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</p>}
      <section><h4 className="text-xs font-bold text-[#052767] dark:text-white">Business details</h4><div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={label}>Salon name *<input required value={draft.settings.name} onChange={(e) => changeSettings({ name: e.target.value })} placeholder="e.g. Noor Salon" className={field} /></label>
        <label className={label}>Owner / manager name<input value={draft.ownerName} onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })} className={field} /></label>
        <label className={label}>Phone<input value={draft.settings.phone} onChange={(e) => changeSettings({ phone: e.target.value })} className={field} /></label>
        <label className={label}>WhatsApp number<input value={draft.whatsapp} onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })} className={field} /></label>
        <label className={label}>Email<input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={field} /></label>
        <label className={label}>City *<input required value={draft.settings.city} onChange={(e) => changeSettings({ city: e.target.value })} className={field} /></label>
        <label className={label}>Area<input value={draft.settings.area} onChange={(e) => changeSettings({ area: e.target.value })} className={field} /></label>
        <label className={label}>Address<input value={draft.settings.address} onChange={(e) => changeSettings({ address: e.target.value })} className={field} /></label>
        <label className={label}>Opening time<input required value={draft.settings.openingTime} onChange={(e) => changeSettings({ openingTime: e.target.value })} placeholder="11:00 AM" className={field} /></label>
        <label className={label}>Closing time<input required value={draft.settings.closingTime} onChange={(e) => changeSettings({ closingTime: e.target.value })} placeholder="09:00 PM" className={field} /></label>
        <label className={`${label} sm:col-span-2`}>Google review URL<input type="url" value={draft.settings.googleReviewUrl} onChange={(e) => changeSettings({ googleReviewUrl: e.target.value })} placeholder="https://…" className={field} /></label>
        <fieldset className="sm:col-span-2"><legend className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Weekly off</legend><div className="mt-2 flex flex-wrap gap-2">{days.map((day) => <label key={day} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] text-slate-600 dark:bg-slate-900 dark:text-slate-300"><input type="checkbox" checked={draft.settings.offDays.includes(day)} onChange={(e) => changeSettings({ offDays: e.target.checked ? [...draft.settings.offDays, day] : draft.settings.offDays.filter((item) => item !== day) })} className="accent-emerald-600" />{day.slice(0,3)}</label>)}</div></fieldset>
      </div></section>

      <section className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="flex items-center gap-1.5 text-xs font-bold text-[#052767] dark:text-white"><Building2 size={14} className="text-emerald-600" /> Branches</h4><p className="mt-1 text-[10px] text-slate-500">Har branch ka alag dashboard aur staff filter hai.</p></div><button type="button" onClick={() => changeSettings({ branches: [...draft.settings.branches, { id: uid("branch"), name: "", area: "" }] })} className={secondary}><Plus size={12} /> Add branch</button></div><div className="mt-3 space-y-2">{draft.settings.branches.map((branch, index) => <div key={branch.id} className="grid gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900 sm:grid-cols-[1fr_1fr_auto]"><label className={label}>Branch name<input required aria-label={`Branch ${index + 1} name`} value={branch.name} onChange={(e) => changeSettings({ branches: draft.settings.branches.map((item) => item.id === branch.id ? { ...item, name: e.target.value } : item) })} className={field} /></label><label className={label}>Area<input aria-label={`Branch ${index + 1} area`} value={branch.area} onChange={(e) => changeSettings({ branches: draft.settings.branches.map((item) => item.id === branch.id ? { ...item, area: e.target.value } : item) })} className={field} /></label><button type="button" onClick={() => deleteBranch(branch.id)} aria-label={`Delete branch ${branch.name || index + 1}`} className="self-end rounded-lg p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 size={15} /></button></div>)}</div></section>

      <section className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="flex items-center gap-1.5 text-xs font-bold text-[#052767] dark:text-white"><Users size={14} className="text-emerald-600" /> Staff / stylists</h4><p className="mt-1 text-[10px] text-slate-500">Photo, branch aur working days set karein; portal login alag se Team access mein banta hai. Staff delete karne par us ki time-off entries bhi remove hoti hain.</p></div><button type="button" onClick={() => changeSettings({ stylists: [...draft.settings.stylists, { id: uid("staff"), name: "", specialty: "", availableDays: days.filter((day) => !draft.settings.offDays.includes(day)), branchId: draft.settings.branches[0]?.id }] })} className={secondary}><Plus size={12} /> Add staff</button></div><div className="mt-3 space-y-3">{draft.settings.stylists.map((staff, index) => <div key={staff.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><div className="flex flex-wrap items-start gap-3 sm:flex-nowrap"><div className="order-1 shrink-0 sm:order-none">{staff.photoDataUrl ? <img src={staff.photoDataUrl} alt={`${staff.name || "Staff"} photo`} className="h-14 w-14 rounded-xl object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-lg font-bold text-emerald-700 dark:bg-slate-800 dark:text-emerald-300">{staff.name.slice(0,1).toUpperCase() || <Users size={20} />}</span>}</div><div className="order-3 grid w-full min-w-0 gap-2 sm:order-none sm:w-auto sm:flex-1 sm:grid-cols-2"><label className={label}>Staff name<input required aria-label={`Staff ${index + 1} name`} value={staff.name} onChange={(e) => changeSettings({ stylists: draft.settings.stylists.map((item) => item.id === staff.id ? { ...item, name: e.target.value } : item) })} placeholder="Name" className={field} /></label><label className={label}>Specialty<input aria-label={`Staff ${index + 1} specialty`} value={staff.specialty} onChange={(e) => changeSettings({ stylists: draft.settings.stylists.map((item) => item.id === staff.id ? { ...item, specialty: e.target.value } : item) })} placeholder="Hair, bridal…" className={field} /></label><label className={`${label} sm:col-span-2`}>Assigned branch<select aria-label={`Staff ${index + 1} branch`} value={staff.branchId ?? ""} onChange={(e) => changeSettings({ stylists: draft.settings.stylists.map((item) => item.id === staff.id ? { ...item, branchId: e.target.value || undefined } : item) })} className={field}><option value="">All branches</option>{draft.settings.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name || "New branch"}</option>)}</select></label></div><button type="button" onClick={() => changeSettings({ stylists: draft.settings.stylists.filter((item) => item.id !== staff.id) })} aria-label={`Delete staff ${staff.name || index + 1}`} className="order-2 ml-auto rounded-lg p-2 text-rose-500 sm:order-none sm:ml-0 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 size={15} /></button></div><fieldset className="mt-3 sm:pl-[68px]"><legend className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Working days · {staff.name || `staff ${index + 1}`}</legend><div className="mt-1.5 flex flex-wrap gap-1.5">{days.map((day) => { const workingDays = staff.availableDays.length ? staff.availableDays : days; const checked = workingDays.includes(day); return <label key={day} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"><input type="checkbox" aria-label={`${staff.name || `Staff ${index + 1}`} works ${day}`} checked={checked} disabled={checked && workingDays.length === 1} onChange={(event) => changeSettings({ stylists: draft.settings.stylists.map((item) => item.id === staff.id ? { ...item, availableDays: event.target.checked ? [...workingDays, day] : workingDays.filter((value) => value !== day) } : item) })} className="accent-emerald-600" />{day.slice(0,3)}</label>; })}</div><p className="mt-1 text-[9px] text-slate-400">Non-working days are closed; use schedule time off for leave.</p></fieldset><div className="mt-2 flex flex-wrap items-center gap-2 sm:pl-[68px]"><label className={`${secondary} cursor-pointer`}><Camera size={12} /> {staff.photoDataUrl ? "Change photo" : "Add photo"}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Upload photo for ${staff.name || `staff ${index + 1}`}`} className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadStaff(staff.id, file); e.target.value = ""; }} /></label>{staff.photoDataUrl && <button type="button" onClick={() => changeSettings({ stylists: draft.settings.stylists.map((item) => item.id === staff.id ? { ...item, photoDataUrl: undefined } : item) })} className="text-[10px] font-bold text-rose-600">Remove photo</button>}<span className="text-[9px] text-slate-400">JPG, PNG, WebP · max 8 MB</span></div></div>)}{draft.settings.stylists.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-900">Abhi koi staff nahi. Add staff se profile banayein.</p>}</div></section>

      <section className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-1.5 text-xs font-bold text-[#052767] dark:text-white"><Scissors size={14} className="text-emerald-600" /> Services & prices</h4><button type="button" onClick={() => changeSettings({ services: [...draft.settings.services, { id: uid("service"), name: "", category: "Hair", pricePKR: 0, durationMinutes: 60, description: "" }] })} className={secondary}><Plus size={12} /> Add service</button></div><div className="mt-3 space-y-2">{draft.settings.services.map((service, index) => <div key={service.id} className="grid gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-[2fr_1.5fr_1fr_1fr_auto]"><label className={label}>Service name<input required aria-label={`Service ${index + 1} name`} value={service.name} onChange={(e) => changeSettings({ services: draft.settings.services.map((item) => item.id === service.id ? { ...item, name: e.target.value } : item) })} className={field} /></label><label className={label}>Category<select aria-label={`Service ${index + 1} category`} value={service.category} onChange={(e) => changeSettings({ services: draft.settings.services.map((item) => item.id === service.id ? { ...item, category: e.target.value as ServiceCategory } : item) })} className={field}><option>Hair</option><option>Skin &amp; Facial</option><option>Makeup &amp; Bridal</option><option>Nails</option></select></label><label className={label}>Price · PKR<input type="number" min="0" aria-label={`Service ${index + 1} price`} value={service.pricePKR} onChange={(e) => changeSettings({ services: draft.settings.services.map((item) => item.id === service.id ? { ...item, pricePKR: Number(e.target.value) } : item) })} className={field} /></label><label className={label}>Minutes<input type="number" min="1" aria-label={`Service ${index + 1} duration`} value={service.durationMinutes} onChange={(e) => changeSettings({ services: draft.settings.services.map((item) => item.id === service.id ? { ...item, durationMinutes: Number(e.target.value) } : item) })} className={field} /></label><button type="button" onClick={() => changeSettings({ services: draft.settings.services.filter((item) => item.id !== service.id) })} aria-label={`Delete service ${service.name || index + 1}`} className="self-end rounded-lg p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 size={15} /></button></div>)}{draft.settings.services.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-900">Booking ke liye pehle koi service add karein.</p>}</div></section>

      <section className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="flex items-center gap-1.5 text-xs font-bold text-[#052767] dark:text-white"><ImagePlus size={14} className="text-emerald-600" /> Salon images</h4><p className="mt-1 text-[10px] text-slate-500">Logo, interior aur team images. Images save ke baad profile mein rahengi.</p></div><div className="flex items-center gap-2"><select aria-label="Salon image type" value={imageKind} onChange={(e) => setImageKind(e.target.value as SalonImageKind)} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[10px] dark:border-slate-700 dark:bg-slate-900"><option value="logo">Logo</option><option value="interior">Interior</option><option value="team">Team</option><option value="service">Service work</option><option value="other">Other</option></select><label className={`${secondary} cursor-pointer`}>Upload image<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadSalon(file); e.target.value = ""; }} /></label></div></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{draft.images.map((photo) => <figure key={photo.id} className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"><img src={photo.dataUrl} alt={photo.name} className="h-20 w-full object-cover" /><figcaption className="truncate p-2 text-[9px] text-slate-500">{photo.kind} · {photo.name}</figcaption><button type="button" onClick={() => setDraft({ ...draft, images: draft.images.filter((item) => item.id !== photo.id) })} aria-label={`Remove ${photo.name}`} className="absolute right-1 top-1 rounded-full bg-rose-600 p-1 text-white"><Trash2 size={12} /></button></figure>)}</div></section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">{exists ? <button type="button" onClick={() => setDeleteConfirm(true)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600"><Trash2 size={13} /> Delete salon</button> : <span className="text-[10px] text-slate-400">Naya salon save karne par dashboard mein aayega.</span>}<button type="submit" disabled={saving || photoBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Check size={14} /> {saving ? "Saving…" : "Save salon"}</button></div>
      {deleteConfirm && <div role="alertdialog" aria-modal="true" aria-labelledby="delete-salon-title" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#050d21]"><h3 id="delete-salon-title" className="text-base font-bold text-[#052767] dark:text-white">{draft.settings.name} delete karein?</h3><p className="mt-2 text-xs leading-relaxed text-slate-500">Is salon ki branches, staff photos, services, bookings, waitlist, products aur orders permanently delete honge. Assigned manager/reception ka access bhi band ho jayega. Ye wapas nahi aayega.</p><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setDeleteConfirm(false)} className={secondary}>Cancel</button><button type="button" onClick={() => void remove()} disabled={saving} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Yes, delete salon</button></div></div></div>}
    </form>
  </div>;
}

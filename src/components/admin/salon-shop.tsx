"use client";

/* Owner-uploaded, resized data URLs are rendered directly rather than optimized. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Check, ChevronRight, ExternalLink, ImagePlus, Package, Plus, RefreshCw, ShoppingBag, Trash2, X } from "lucide-react";
import { useWorkspaces } from "@/context/workspace-context";
import { PRODUCT_CATEGORIES, type ProductCategory, type ProductDraft, type ProductOrderStatus, type SalonProduct } from "@/types/shop";

const field = "mt-1 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const label = "block min-w-0 text-[11px] font-bold text-slate-600 dark:text-slate-300";
const secondary = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
const money = (value: number) => `PKR ${value.toLocaleString("en-PK")}`;
const newProduct = (): ProductDraft => ({ id: `product-${crypto.randomUUID()}`, name: "", category: "Hair care", description: "", pricePKR: 0, published: true, version: 0 });

async function resizedProductImage(file: File): Promise<string> {
  if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(file.type)) throw new Error("Sirf JPG, PNG ya WebP photo chunein.");
  if (file.size > 8_000_000) throw new Error("Photo 8 MB se choti honi chahiye.");
  const source = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Photo read nahi ho saki.")); image.src = source; });
    const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo resize nahi hui.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/webp", 0.72);
    if (data.length > 350_000) throw new Error("Photo bohat bari hai; choti image try karein.");
    return data;
  } finally { URL.revokeObjectURL(source); }
}

export default function SalonShop() {
  const { activeWorkspace, workspaces, selectWorkspace, demo, refreshWorkspaces, saveProduct, deleteProduct, setProductOrderStatus, deleteProductOrder } = useWorkspaces();
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const modal = useRef<HTMLFormElement>(null);
  const savingRef = useRef(false);
  useEffect(() => { savingRef.current = saving || imageBusy; }, [saving, imageBusy]);
  const modalOpen = draft !== null;
  useEffect(() => {
    if (!modalOpen) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => modal.current?.querySelector<HTMLInputElement>("input:not([type=file])")?.focus(), 0);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingRef.current) { event.preventDefault(); setDraft(null); setError(""); return; }
      if (event.key !== "Tab" || !modal.current) return;
      const items = Array.from(modal.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (!modal.current.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); window.clearTimeout(timer); document.body.style.overflow = previousOverflow; trigger?.focus(); };
  }, [modalOpen]);

  const products = activeWorkspace.products ?? [];
  const orders = activeWorkspace.productOrders ?? [];
  const pending = orders.filter((order) => order.status === "pending").length;
  const elsewhere = workspaces.filter((workspace) => workspace.id !== activeWorkspace.id && (workspace.productOrders ?? []).some((order) => order.status === "pending"));
  const edit = (product: SalonProduct) => {
    setError("");
    setDraft({ id: product.id, name: product.name, category: product.category, description: product.description, pricePKR: product.pricePKR, imageDataUrl: product.imageDataUrl, published: product.published, version: product.version });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || saving || imageBusy) return;
    setError(""); setSaving(true);
    const result = await saveProduct(draft);
    setSaving(false);
    if (result.ok) setDraft(null); else setError(result.message ?? "Product save nahi hua.");
  };
  const upload = async (file: File) => {
    setError(""); setImageBusy(true);
    try { const imageDataUrl = await resizedProductImage(file); setDraft((current) => current ? { ...current, imageDataUrl } : current); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Photo upload nahi hui."); }
    finally { setImageBusy(false); }
  };
  const run = async (key: string, work: () => Promise<{ ok: boolean; message?: string }>) => {
    if (busyId) return;
    setBusyId(key); setError("");
    try { const result = await work(); if (!result.ok) setError(result.message ?? "Save nahi hua."); }
    finally { setBusyId(""); }
  };
  const changeStatus = (id: string, status: ProductOrderStatus) => {
    if (status === "cancelled" && !window.confirm("Order cancel karein? Customer ko manually batana hoga.")) return;
    void run(id, () => setProductOrderStatus(id, status));
  };

  if (demo) return <section className="rounded-2xl border border-emerald-100 bg-white p-6 dark:border-emerald-900 dark:bg-[#050d21]"><ShoppingBag className="text-emerald-600" size={24} /><h2 className="mt-3 text-lg font-extrabold text-[#052767] dark:text-white">Products &amp; orders</h2><p className="mt-2 max-w-lg text-xs leading-relaxed text-slate-500 dark:text-slate-400">Ye sample dashboard hai. Website par products publish karne aur asli order requests dekhne ke liye owner/admin se sign in karein.</p><Link href="/admin/login" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white">Admin sign in <ChevronRight size={14} /></Link></section>;

  return <div className="space-y-4">
    <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-5 dark:border-emerald-900/50 dark:bg-[#050d21] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400"><ShoppingBag size={13} /> Your salon shop</span><h2 className="mt-2 text-xl font-extrabold text-[#052767] dark:text-white">Products &amp; orders</h2><p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">{activeWorkspace.settings.name} ka catalog aur website se aane wali order requests. Ye salon-wide hain; branch filter apply nahi hota.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={!!busyId} onClick={() => { setBusyId("refresh"); void refreshWorkspaces().finally(() => setBusyId("")); }} className={secondary}><RefreshCw size={13} className={busyId === "refresh" ? "animate-spin" : ""} /> Refresh orders</button><Link href="/products" target="_blank" className={secondary}>View shop <ExternalLink size={12} /></Link></div>
      </div>
      {activeWorkspace.isSample && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><strong>Sample salon:</strong> product names, images aur prices demo ke liye hain. Aap inhein edit, unpublish ya delete kar sakte hain.</p>}
      <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Orders pehle pending aate hain. Availability, delivery charges aur payment manually confirm karein; koi payment ya message automatically nahi hota.</p>
      {elsewhere.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300"><span>Doosre salons mein pending orders:</span>{elsewhere.map((workspace) => <button type="button" key={workspace.id} onClick={() => selectWorkspace(workspace.id)} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{workspace.settings.name} · {(workspace.productOrders ?? []).filter((order) => order.status === "pending").length}</button>)}</div>}
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-[#050d21]" role="tablist" aria-label="Shop management">
        <button type="button" role="tab" aria-selected={tab === "products"} onClick={() => { setTab("products"); setError(""); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${tab === "products" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "text-slate-500"}`}>Products <span className="ml-1 text-[10px]">{products.length}</span></button>
        <button type="button" role="tab" aria-selected={tab === "orders"} onClick={() => { setTab("orders"); setError(""); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${tab === "orders" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "text-slate-500"}`}>Orders {pending > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">{pending} new</span>}</button>
      </div>
      {tab === "products" && <button type="button" onClick={() => { setError(""); setDraft(newProduct()); }} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"><Plus size={15} /> Add product</button>}
    </div>
    {error && !draft && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    {tab === "products" ? <section aria-label="Products" className="grid gap-3 md:grid-cols-2">
      {products.map((product) => <article key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]"><div className="flex min-w-0 gap-3">{product.imageDataUrl ? <img src={product.imageDataUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" /> : <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40"><Package size={26} /></span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-1.5"><h3 className="break-words text-sm font-extrabold text-[#052767] dark:text-white">{product.name}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold uppercase ${product.published ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{product.published ? "Published" : "Draft"}</span></div><p className="mt-1 text-[10px] text-slate-500">{product.category}</p><strong className="mt-1 block text-sm text-slate-800 dark:text-slate-200">{money(product.pricePKR)}</strong></div></div><div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800"><button type="button" onClick={() => edit(product)} className={secondary}>Edit</button><button type="button" disabled={!!busyId} onClick={() => void run(product.id, () => saveProduct({ ...product, published: !product.published }))} className={secondary}>{product.published ? "Unpublish" : "Publish"}</button><button type="button" disabled={!!busyId} onClick={() => { if (window.confirm(`${product.name} delete karein? Purane orders mein us ka naam aur price safe rahenge.`)) void run(product.id, () => deleteProduct(product.id, product.version)); }} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold text-rose-600 disabled:opacity-50"><Trash2 size={13} /> Delete</button></div></article>)}
      {products.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-[#050d21] md:col-span-2"><Package className="mx-auto text-emerald-500" size={28} /><h3 className="mt-3 text-sm font-extrabold text-[#052767] dark:text-white">Abhi koi product nahi</h3><p className="mt-1 text-xs text-slate-500">Product add karke publish karein; wo homepage aur shop dono par nazar aayega.</p><button type="button" onClick={() => { setError(""); setDraft(newProduct()); }} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Add first product</button></div>}
    </section> : <section aria-label="Orders" className="space-y-3">
      {orders.map((order) => <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#052767] dark:text-white">{order.reference}</strong><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold uppercase ${order.status === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : order.status === "cancelled" ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>{order.status}</span></div><p className="mt-1 text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" })}</p></div><div className="text-left sm:text-right"><strong className="block text-sm text-[#052767] dark:text-white">{money(order.totalPKR)}</strong><span className="text-[10px] text-slate-400">{activeWorkspace.isSample ? "Demo product total" : "Product total · delivery extra"}</span></div></div><div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900 sm:grid-cols-2"><p><span className="text-slate-400">Product</span><strong className="mt-0.5 block break-words text-slate-700 dark:text-slate-200">{order.productName} × {order.quantity}</strong><span className="text-[10px] text-slate-400">{money(order.unitPricePKR)} each</span></p><p><span className="text-slate-400">Customer</span><strong className="mt-0.5 block break-words text-slate-700 dark:text-slate-200">{order.customerName}</strong><a className="text-[11px] font-bold text-emerald-700 underline dark:text-emerald-400" href={`tel:${order.customerPhone.replace(/[^+\d]/g, "")}`}>{order.customerPhone}</a></p><p className="min-w-0 sm:col-span-2"><span className="text-slate-400">Delivery address</span><span className="mt-0.5 block whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200">{order.deliveryAddress}</span></p>{order.notes && <p className="min-w-0 sm:col-span-2"><span className="text-slate-400">Note</span><span className="mt-0.5 block whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200">{order.notes}</span></p>}</div><div className="mt-3 flex flex-wrap gap-2">{order.status === "pending" && <button type="button" disabled={!!busyId} onClick={() => changeStatus(order.id, "confirmed")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"><Check size={13} /> Confirm order</button>}{order.status === "confirmed" && <button type="button" disabled={!!busyId} onClick={() => changeStatus(order.id, "fulfilled")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"><Check size={13} /> Mark fulfilled</button>}{(order.status === "pending" || order.status === "confirmed") && <button type="button" disabled={!!busyId} onClick={() => changeStatus(order.id, "cancelled")} className={secondary}>Cancel order</button>}{(order.status === "fulfilled" || order.status === "cancelled") && <button type="button" disabled={!!busyId} onClick={() => { if (window.confirm(`${order.reference} ka record permanently delete karein?`)) void run(order.id, () => deleteProductOrder(order.id)); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold text-rose-600 disabled:opacity-50"><Trash2 size={13} /> Delete record</button>}<span className="self-center text-[10px] text-slate-400">{activeWorkspace.isSample ? "Demo request — koi asli delivery ya message nahi." : "Customer se manually rabta karein."}</span></div></article>)}
      {orders.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-[#050d21]"><ShoppingBag className="mx-auto text-emerald-500" size={28} /><h3 className="mt-3 text-sm font-extrabold text-[#052767] dark:text-white">Abhi koi order nahi</h3><p className="mt-1 text-xs text-slate-500">Website se aane wali order requests yahan pending nazar aayengi. Nayi requests ke liye refresh karein.</p></div>}
    </section>}
    {draft && <div role="dialog" aria-modal="true" aria-labelledby="product-form-title" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-3 sm:p-4"><form ref={modal} onSubmit={(event) => void submit(event)} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#050d21] sm:p-6"><div className="flex items-start justify-between gap-3"><div><span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">{activeWorkspace.settings.name}</span><h3 id="product-form-title" className="mt-1 text-lg font-extrabold text-[#052767] dark:text-white">{draft.version ? "Edit product" : "Add product"}</h3></div><button type="button" aria-label="Close product form" disabled={saving || imageBusy} onClick={() => { setDraft(null); setError(""); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17} /></button></div><div className="mt-4 space-y-3"><label className={label}>Product name<input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={field} placeholder="e.g. Repair hair mask" /></label><div className="grid gap-3 sm:grid-cols-2"><label className={label}>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as ProductCategory })} className={field}>{PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label className={label}>Price · PKR<input required type="number" min="1" max="10000000" step="1" value={draft.pricePKR || ""} onChange={(event) => setDraft({ ...draft, pricePKR: Number(event.target.value) })} className={field} placeholder="e.g. 2500" /></label></div><label className={label}>Description <span className="font-normal text-slate-400">(optional)</span><textarea rows={3} maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={field} placeholder="Size, ingredients or product details" /></label><div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">{draft.imageDataUrl ? <img src={draft.imageDataUrl} alt="Product preview" className="h-16 w-16 rounded-lg object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-900"><ImagePlus size={20} /></span>}<div className="flex flex-wrap items-center gap-2"><label className={`${secondary} cursor-pointer focus-within:ring-2 focus-within:ring-emerald-500`}><Camera size={13} /> {imageBusy ? "Preparing…" : draft.imageDataUrl ? "Change photo" : "Upload photo"}<input type="file" disabled={imageBusy || saving} accept="image/jpeg,image/png,image/webp" aria-label="Upload product photo" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} /></label>{draft.imageDataUrl && <button type="button" onClick={() => setDraft({ ...draft, imageDataUrl: undefined })} className="text-[11px] font-bold text-rose-600">Remove</button>}<span className="w-full text-[10px] text-slate-400">JPG, PNG or WebP · max 8 MB</span></div></div><label className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} className="mt-0.5 accent-emerald-600" /><span><strong>Publish on website</strong><span className="block text-[10px]">Unchecked rakhein to product sirf draft rahega.</span></span></label></div>{error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" disabled={saving || imageBusy} onClick={() => { setDraft(null); setError(""); }} className={secondary}>Cancel</button><button type="submit" disabled={saving || imageBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Check size={14} /> {saving ? "Saving…" : "Save product"}</button></div></form></div>}
  </div>;
}

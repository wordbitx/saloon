"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import type { PublicProduct } from "@/types/shop";

const field = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const label = "block text-[11px] font-bold text-slate-600 dark:text-slate-300";

export default function OrderRequestForm({ product }: { product: PublicProduct }) {
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState("");
  const requestKey = useRef<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setError(""); setSending(true);
    try {
      requestKey.current ??= crypto.randomUUID();
      const response = await fetch(`/api/public/orders/${encodeURIComponent(product.salonId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, productVersion: product.version, requestKey: requestKey.current, quantity, customerName: name, customerPhone: phone, deliveryAddress: address, notes, consent, website }) });
      const data = await response.json() as { error?: string; reference?: string };
      if (!response.ok) { setError(data.error ?? "Order request send nahi hui."); return; }
      setReference(data.reference ?? "");
    } catch { setError("Connection nahi bana. Same details ke saath dobara try karein; duplicate request nahi banegi."); }
    finally { setSending(false); }
  };
  if (reference !== null) return <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 size={24} /><h2 className="mt-3 text-lg font-extrabold">Order request bhej di gayi</h2>{reference && <p className="mt-2 text-xs font-bold">Reference: {reference}</p>}<p className="mt-2 text-xs leading-relaxed">{product.isSample ? "Ye sirf demo request hai; koi asli product, payment ya delivery nahi hogi. Request sample salon ke admin panel mein nazar aayegi." : `${product.salonName} request review karega. Product availability, delivery charges aur payment abhi confirm nahi hain; salon aapse manually rabta karega.`} Koi automatic message nahi bheja gaya.</p><Link href="/products" className="mt-4 inline-flex text-xs font-extrabold underline">Back to shop</Link></div>;
  return <form onSubmit={(event) => void submit(event)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/30 dark:border-slate-800 dark:bg-[#071228] dark:shadow-none sm:p-6"><span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-emerald-700 dark:text-emerald-400"><ShoppingBag size={13} /> Order request</span><h2 className="mt-2 text-lg font-extrabold text-[#09265d] dark:text-white">Apni details bhejein</h2><p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{product.isSample ? "Ye test request sirf sample admin panel mein nazar aayegi." : "Ek request mein ek product. Salon aapse contact karke order aur delivery confirm karega."}</p>
    {product.isSample && <p role="note" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><strong>Sample product &amp; price.</strong> Ye order sirf demo hai; asli stock ya delivery nahi hai. Meherbani karke fictional contact aur address use karein.</p>}
    <div className="mt-5 space-y-3.5"><div className="grid gap-3 sm:grid-cols-2"><label className={label}>Quantity<input type="number" required min="1" max="20" step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className={field} /></label><div className="rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/30"><span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">Product total</span><strong className="block text-sm font-extrabold text-[#09265d] dark:text-white">PKR {(product.pricePKR * (Number.isFinite(quantity) ? quantity : 0)).toLocaleString("en-PK")}</strong><span className="text-[10px] text-slate-500">{product.isSample ? "Demo total only" : "Delivery charges alag"}</span></div></div><label className={label}>Aapka naam<input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={field} /></label><label className={label}>Phone number<input required maxLength={30} type="tel" autoComplete="tel" placeholder="03xx xxxxxxx" value={phone} onChange={(event) => setPhone(event.target.value)} className={field} /></label><label className={label}>Delivery address<textarea required minLength={5} maxLength={350} autoComplete="street-address" rows={3} value={address} onChange={(event) => setAddress(event.target.value)} className={field} placeholder="House / street, area, city" /></label><label className={label}>Order note <span className="font-normal text-slate-400">(optional)</span><textarea rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} className={field} /></label><div className="hidden" aria-hidden="true"><label>Leave empty<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label></div><label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300"><input required type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 accent-emerald-600" /><span>{product.isSample ? "Main samajhta/samajhti hoon ke ye sirf demo hai aur meri fictional details sample salon ke admin ko dikhengi." : `Main ${product.salonName} ko is order ke bare mein phone par contact karne ki permission deta/deti hoon. Meri contact aur delivery details salon ke admin ko dikhengi.`}</span></label></div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    <button type="submit" disabled={sending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1CA830] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50">{sending && <Loader2 size={15} className="animate-spin" />}{sending ? "Sending…" : product.isSample ? "Send demo request" : "Send order request"}</button><p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">No online payment or automatic confirmation. Do not submit payment details.</p>
  </form>;
}

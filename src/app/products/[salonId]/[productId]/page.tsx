/* Product photos are served from a published-only route. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, ShieldCheck } from "lucide-react";
import { getPublicProduct } from "@/lib/workspaces/store";
import OrderRequestForm from "./order-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Product order request | WordbitX" };

export default async function ProductPage({ params }: { params: Promise<{ salonId: string; productId: string }> }) {
  const { salonId, productId } = await params;
  let product;
  try { product = await getPublicProduct(salonId, productId); }
  catch (error) {
    console.error("[shop] product unavailable", error);
    return <div className="mx-auto max-w-xl px-5 py-20 text-center"><h1 className="text-xl font-extrabold text-[#09265d] dark:text-white">Product abhi load nahi ho raha</h1><p className="mt-2 text-sm text-slate-500">Thori dair baad dobara try karein.</p><Link href="/products" className="mt-4 inline-flex text-xs font-bold text-emerald-700 underline">Back to shop</Link></div>;
  }
  if (!product) notFound();
  return <div className="bg-[#f8faf7] px-5 py-8 dark:bg-[#030814] sm:px-8 sm:py-12"><div className="mx-auto max-w-[1120px]"><Link href="/products" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300"><ArrowLeft size={14} /> All products</Link><div className="mt-6 grid items-start gap-7 lg:grid-cols-[1fr_0.9fr] lg:gap-12"><div className="min-w-0"><div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-[#e9f0e9] dark:bg-[#10251f]">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center bg-gradient-to-br from-[#e8efe9] to-[#e0ebe4] text-emerald-700/40 dark:from-[#0e2b22] dark:to-[#0c1c2a] dark:text-emerald-300/40"><Package size={70} strokeWidth={1} /></span>}{product.isSample && <span className="absolute left-4 top-4 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-amber-800">Sample product</span>}</div><div className="mt-5"><span className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">{product.category} · {product.salonName} · {product.city}</span><h1 className="mt-2 break-words text-2xl font-extrabold tracking-tight text-[#09265d] dark:text-white sm:text-3xl">{product.name}</h1><p className="mt-3 text-xl font-extrabold text-[#09265d] dark:text-white">PKR {product.pricePKR.toLocaleString("en-PK")}</p>{product.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600 dark:text-slate-400">{product.description}</p>}<p className="mt-5 flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-[#071228] dark:text-slate-400"><ShieldCheck size={16} className="shrink-0 text-emerald-600" /> {product.isSample ? "Demo product aur price illustrative hain; koi asli stock, payment ya delivery nahi." : `Request directly to ${product.salonName}. Final availability, delivery cost and payment are confirmed manually.`}</p></div></div><OrderRequestForm product={product} /></div></div></div>;
}

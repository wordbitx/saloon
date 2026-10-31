"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import type { PublicProduct } from "@/types/shop";
import ProductCard from "@/components/shop/product-card";

/** The homepage is otherwise static/sample-driven; fetch only published shop data. */
export default function ProductShowcase() {
  const [products, setProducts] = useState<PublicProduct[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/products", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Catalog unavailable"); return response.json() as Promise<{ products: PublicProduct[] }>; })
      .then((data) => setProducts(data.products))
      .catch(() => { if (!controller.signal.aborted) { setFailed(true); setProducts([]); } });
    return () => controller.abort();
  }, []);
  const featured = (products ?? []).slice(0, 4);
  return <section id="salon-products" aria-labelledby="salon-products-heading" className="border-b border-slate-200/80 bg-[#f3f7f2] py-16 dark:border-[#14213a] dark:bg-[#07151a] sm:py-20">
    <div className="mx-auto max-w-[1280px] px-5 sm:px-8"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-700 dark:text-emerald-400"><Sparkles size={13} /> THE SALON EDIT</span><h2 id="salon-products-heading" className="mt-2 text-2xl font-extrabold tracking-tight text-[#09265d] dark:text-white sm:text-3xl">A little care, every day.</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">Apne salons ke products discover karein — aur seedha order request bhejein.</p>{featured.some((product) => product.isSample) && <p className="mt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Sample products aur prices sirf demo ke liye hain.</p>}</div><Link href="/products" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-700/20 bg-white px-4 text-xs font-extrabold text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-[#0b211e] dark:text-emerald-300">Explore all products <ArrowRight size={15} /></Link></div>
      {products === null ? <div aria-label="Loading products" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />)}</div> : featured.length ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">{featured.map((product) => <ProductCard key={`${product.salonId}-${product.id}`} product={product} />)}</div> : <div className="grid overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm dark:border-emerald-900/40 dark:bg-[#071228] md:grid-cols-2"><div className="relative min-h-48 md:min-h-60"><Image src="/images/salon-product-editorial.jpg" alt="Unbranded salon-care products on a calm, neutral surface" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" /></div><div className="flex flex-col justify-center p-6 sm:p-8"><span className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">{failed ? "Shop temporarily unavailable" : "A thoughtful shelf"}</span><h3 className="mt-2 text-xl font-extrabold text-[#09265d] dark:text-white">{failed ? "Products load nahi ho rahe." : "Products coming soon."}</h3><p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">{failed ? "Thori dair baad shop dobara check karein." : "Salon admin jab products publish karega, woh yahan aur shop page par nazar aayenge."}</p><Link href="/products" className="mt-4 inline-flex w-fit items-center gap-1.5 text-xs font-extrabold text-emerald-700 hover:underline dark:text-emerald-400">Visit the shop <ArrowRight size={13} /></Link></div></div>}
    </div>
  </section>;
}

/* Uploaded salon product photos are served through a controlled public route. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import type { PublicProduct } from "@/types/shop";

export function productHref(product: PublicProduct) {
  return `/products/${encodeURIComponent(product.salonId)}/${encodeURIComponent(product.id)}`;
}

export default function ProductCard({ product }: { product: PublicProduct }) {
  return <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-[#071228] dark:hover:border-emerald-800 dark:hover:shadow-none">
    <Link href={productHref(product)} aria-label={`View ${product.name}`} className="relative block aspect-[5/4] overflow-hidden bg-[#edf2ed] dark:bg-[#10251f]">
      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <span aria-hidden="true" className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#e8efe9] via-[#f3f4ed] to-[#e1ebe3] text-emerald-700/50 dark:from-[#0e2b22] dark:via-[#112b2b] dark:to-[#0c1c2a] dark:text-emerald-300/40"><Package size={42} strokeWidth={1.25} /></span>}
      {product.isSample && <span className="absolute left-3 top-3 rounded-full border border-amber-200 bg-amber-50/95 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-800">Sample product</span>}
      <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.12em] text-[#17462b] backdrop-blur-sm">{product.category}</span>
    </Link>
    <div className="flex flex-1 flex-col p-4 sm:p-5"><p className="truncate text-[10px] font-bold uppercase tracking-[.12em] text-emerald-700 dark:text-emerald-400">{product.salonName} · {product.city}</p><Link href={productHref(product)} className="mt-2 text-sm font-extrabold leading-snug text-[#09265d] hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{product.name}</Link>{product.description && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{product.description}</p>}<div className="mt-auto flex items-end justify-between gap-3 pt-4"><span><strong className="block text-sm font-extrabold text-[#09265d] dark:text-white">PKR {product.pricePKR.toLocaleString("en-PK")}</strong>{product.isSample && <span className="text-[9px] font-semibold text-slate-400">Sample price</span>}</span><Link href={productHref(product)} className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 hover:underline dark:text-emerald-400">View &amp; order <ArrowUpRight size={13} /></Link></div></div>
  </article>;
}

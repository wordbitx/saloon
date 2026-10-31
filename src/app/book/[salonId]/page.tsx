import { notFound } from "next/navigation";
import Link from "next/link";
import { publicBookingInfo } from "@/lib/workspaces/store";
import BookingRequestForm from "./request-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Appointment request | Salon", robots: { index: false, follow: false } };

/** A salon's owner explicitly enables and shares this link. */
export default async function PublicBookingPage({ params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = await params;
  const salon = await publicBookingInfo(salonId);
  if (!salon) notFound();
  return <main className="min-h-screen bg-[#f5f8fc] px-4 py-8 dark:bg-[#030814] sm:py-14">
    <div className="mx-auto w-full max-w-xl">
      <Link href="/" className="text-xs font-extrabold tracking-tight text-[#052767] dark:text-white">wordbit<span className="text-[#1CA830]">X</span> <span className="ml-1 text-[10px] font-semibold text-slate-400">SALON</span></Link>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-[#050d21] dark:shadow-none sm:p-8">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Appointment request</span>
        <h1 className="mt-4 text-2xl font-extrabold text-[#052767] dark:text-white">{salon.name}</h1><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{salon.city} · Apni preferred service aur time bhejein.</p>
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><strong>Ye confirmed booking nahi hai.</strong> Salon aapki request review karke manually contact karega. Slot tabhi confirm hoga jab salon aapko bataye.</p>
        <BookingRequestForm salon={salon} />
      </div>
      <p className="mt-5 text-center text-[10px] text-slate-400">Powered by WordbitX · No automatic WhatsApp or SMS is sent.</p>
    </div>
  </main>;
}

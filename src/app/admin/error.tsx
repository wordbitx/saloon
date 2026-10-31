"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Fail closed if the configured store cannot be read; never show sample data as a substitute. */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const signOut = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed");
      router.replace("/");
      router.refresh();
    } catch { setMessage("Sign out nahi hua. Connection check karke dobara try karein."); }
  };
  return <section className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-xl font-bold text-[#052767] dark:text-white">Workspace load nahi hua</h1><p className="mt-3 text-sm leading-relaxed text-slate-500">Connection ya configured storage check karein, phir dobara koshish karein. Aapke salon data ki jagah demo data nahi dikhaya gaya.</p>{message && <p role="alert" className="mt-3 text-xs text-rose-600">{message}</p>}<div className="mt-5 flex justify-center gap-2"><button onClick={reset} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Retry</button><button onClick={() => void signOut()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Sign out</button></div></section>;
}

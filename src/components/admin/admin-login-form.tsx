"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ROLE_DESCRIPTION, ROLE_LABEL, STAFF_ROLES } from "@/lib/auth/roles";

export default function AdminLoginForm({
  defaultHint,
  signedOutReason,
}: {
  defaultHint: { email: string; password: string } | null;
  signedOutReason?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultHint?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Sign in nahi hua.");
        setBusy(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error — dobara koshish karein.");
      setBusy(false);
    }
  };

  const fillDefault = () => {
    if (!defaultHint) return;
    setEmail(defaultHint.email);
    setPassword(defaultHint.password);
    setShowPassword(true);
    setError("");
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-120px)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_.85fr] lg:px-8">
      <section>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Sparkles size={14} /> WordbitX · Salon workspace
        </div>
        <h1 className="mt-6 max-w-xl text-4xl font-extrabold tracking-tight text-[#052767] dark:text-white sm:text-5xl">
          Salon team ke liye secure sign in.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          Owner, manager aur reception ke apne logins. Sign in karne par sirf aap ke role wale sections khulte hain —
          aur sirf owner hi naye logins bana sakta hai, role badal sakta hai ya password reset kar sakta hai.
        </p>

        <div className="mt-7 space-y-2.5">
          {STAFF_ROLES.map((role) => (
            <div key={role} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#050d21]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-600" />
                <strong className="text-xs text-[#052767] dark:text-white">{ROLE_LABEL[role]}</strong>
              </div>
              <span className="mt-1 block text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{ROLE_DESCRIPTION[role]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-[#050d21] sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#052767] text-white"><LockKeyhole size={19} /></span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">Admin access</p>
            <h2 className="text-xl font-bold text-[#052767] dark:text-white">Sign in to workspace</h2>
          </div>
        </div>

        {signedOutReason === "disabled" && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>Aap ka login band kar diya gaya hai.</strong> Owner se kahein ke wo “Team access” se access wapas on karein.
          </p>
        )}

        {defaultHint && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-relaxed text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <strong className="block">Default owner login (pehli baar)</strong>
            <span className="mt-1 block font-mono text-[11px]">{defaultHint.email}</span>
            <span className="block font-mono text-[11px]">{defaultHint.password}</span>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[10px] opacity-80">Sign in karke turant password change karein.</span>
              <button type="button" onClick={fillDefault} className="shrink-0 rounded-lg bg-emerald-700 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-800">
                Fill form
              </button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Work email</label>
            <div className="relative">
              <UserRound size={14} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@salon.pk"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Password</label>
            <div className="relative">
              <KeyRound size={14} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Apna password"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 p-3 text-[11px] font-semibold leading-relaxed text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1CA830] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-800/10 transition hover:bg-[#178e29] disabled:opacity-60"
          >
            {busy ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight size={15} /></>}
          </button>
        </form>

        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <strong>Note:</strong> login sirf owner/manager/reception accounts ke liye hai. Login banane ya band karne ka
          ikhtiyar sirf owner ke paas hai. Bhoola hua password owner reset karta hai.
        </p>

        <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-emerald-700 dark:hover:text-emerald-300"><ArrowLeft size={12} /> Public site</Link>
          <Link href="/dashboard" className="hover:text-emerald-700 dark:hover:text-emerald-300">Sample dashboard →</Link>
        </div>
      </section>
    </div>
  );
}

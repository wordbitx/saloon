"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import { DemoAdminRole, createDemoAdminSession } from "@/lib/admin-demo-session";
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase-browser";

const demoRoles: { role: DemoAdminRole; title: string; description: string; access: string }[] = [
  { role: "owner", title: "Owner workspace", description: "Full demo workspace, reports, settings and staff overview.", access: "Full demo access" },
  { role: "manager", title: "Salon manager", description: "Bookings, customers, inbox and daily operations.", access: "Operations access" },
  { role: "reception", title: "Reception desk", description: "Today’s appointments, enquiries and booking actions.", access: "Front-desk preview" },
];

const allowedRoles: DemoAdminRole[] = ["owner", "manager", "reception"];

export default function AdminLoginPage() {
  const router = useRouter();
  const authReady = isSupabaseAuthConfigured();
  const [selectedRole, setSelectedRole] = useState<DemoAdminRole>("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const enterDemo = () => {
    createDemoAdminSession(selectedRole);
    router.push("/admin");
  };

  const signInWithSupabase = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    window.localStorage.removeItem("wordbitx-admin-demo-session");
    if (!authReady) {
      setError("Supabase Auth is not configured. Use demo access, or add the Supabase public URL and key to the environment.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError || !data.user) {
      setError(signInError?.message ?? "Sign-in could not be completed.");
      setBusy(false);
      return;
    }
    const role = data.user.app_metadata?.role;
    if (!allowedRoles.includes(role)) {
      await supabase.auth.signOut();
      setError("This account is not assigned an admin role. TODO (owner decision): provision an owner, manager or reception role in trusted Supabase app metadata.");
      setBusy(false);
      return;
    }
    router.push("/admin");
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-120px)] max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_.9fr] lg:px-8">
      <section>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"><Sparkles size={14} /> WordbitX · Salon workspace</div>
        <h1 className="mt-6 max-w-xl text-4xl font-extrabold tracking-tight text-[#052767] dark:text-white sm:text-5xl">A clearer view of salon operations.</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">Bookings, recovery sources, enquiries and waitlist actions in one owner workspace. Use real Supabase sign-in when configured, or explore the clearly marked sample workspace.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">{["Bookings & recovery log", "Enquiry inbox", "Waitlist actions", "Services, staff & reports"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-[#050d21] dark:text-slate-200"><ShieldCheck size={15} className="text-emerald-600" />{item}</div>)}</div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-[#050d21] sm:p-8">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#052767] text-white"><LockKeyhole size={19} /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">Admin access</p><h2 className="text-xl font-bold text-[#052767] dark:text-white">Sign in to workspace</h2></div></div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><strong>Preview notice:</strong> the demo session is stored in this browser only and is not a security boundary. Real owner/admin access requires Supabase Auth and trusted role provisioning.</div>

        {authReady ? <form onSubmit={signInWithSupabase} className="mt-5 space-y-3">
          <div><label htmlFor="admin-email" className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Work email</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@salon.com" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></div>
          <div><label htmlFor="admin-password" className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Password</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your Supabase Auth password" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></div>
          <button disabled={busy} className="w-full rounded-xl bg-[#052767] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#0a3582] disabled:opacity-60">{busy ? "Checking account…" : "Sign in with Supabase"}</button>
        </form> : <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><strong>Real sign-in is not configured in this preview.</strong> Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then assign role values in trusted Supabase app metadata to enable it.</div>}

        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-[11px] leading-relaxed text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

        <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800"/><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Or explore sample workspace</span><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800"/></div>
        <div className="space-y-2">{demoRoles.map((item) => <button key={item.role} onClick={() => setSelectedRole(item.role)} className={`w-full rounded-xl border p-3 text-left transition ${selectedRole === item.role ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/10 dark:bg-emerald-950/30" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"}`}><span className="flex items-start justify-between gap-3"><span><strong className="block text-xs text-[#052767] dark:text-white">{item.title}</strong><span className="mt-1 block text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</span></span><span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selectedRole === item.role ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 dark:border-slate-600"}`}>{selectedRole === item.role && <span className="h-1.5 w-1.5 rounded-full bg-white"/>}</span></span><span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400"><Users size={11}/>{item.access}</span></button>)}</div>
        <button onClick={enterDemo} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1CA830] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-800/10 transition hover:bg-[#178e29] active:scale-[.99]">Open {selectedRole} demo <ArrowRight size={16}/></button>
        <Link href="/" className="mt-4 block text-center text-[10px] font-semibold text-slate-500 hover:text-emerald-700">Back to public product page</Link>
      </section>
    </div>
  );
}

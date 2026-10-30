"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronDown, KeyRound, Loader2, LogOut, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { ROLE_LABEL } from "@/lib/auth/roles";

export default function AccountMenu() {
  const { user, signOut, demo } = useAuth();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const initials = (user.displayName || user.email).slice(0, 1).toUpperCase();

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Naya password dono jagah same likhein.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Password change nahi hua.");
        return;
      }
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Password change ho gaya. Agli baar naye password se sign in karein.");
    } catch {
      setError("Network error — dobara koshish karein.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 text-left transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#052767] to-[#1CA830] text-[11px] font-extrabold text-white">{initials}</span>
          <span className="hidden min-w-0 sm:block">
            <strong className="block max-w-[120px] truncate text-[11px] font-bold text-[#052767] dark:text-white">{user.displayName}</strong>
            <span className="block text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{ROLE_LABEL[user.role]}</span>
          </span>
          <ChevronDown size={13} className="text-slate-400" />
        </button>

        {open && (
          <div role="menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#050d21]">
            <div className="border-b border-slate-100 p-3 dark:border-slate-800">
              <strong className="block truncate text-xs text-slate-800 dark:text-white">{user.displayName}</strong>
              <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{user.email}</span>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck size={10} /> {ROLE_LABEL[user.role]}
              </span>
              {user.backend === "memory" && (
                <span className="mt-1 block text-[9px] leading-relaxed text-amber-700 dark:text-amber-300">Temporary storage — DATABASE_URL set karein.</span>
              )}
            </div>
            <button
              onClick={() => { setOpen(false); setPasswordOpen(true); setError(""); }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70"
              role="menuitem"
            >
              <KeyRound size={13} /> Apna password change karein
            </button>
            {!demo && (
              <button
                onClick={() => void signOut()}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-[11px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                role="menuitem"
              >
                <LogOut size={13} /> Sign out
              </button>
            )}
          </div>
        )}
      </div>

      {notice && (
        <div role="status" className="fixed bottom-5 right-5 z-[95] flex max-w-sm items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-bold text-emerald-900 shadow-lg dark:border-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> {notice}
        </div>
      )}

      {passwordOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
          <form onSubmit={submitPassword} className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#050d21]">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Account security</span>
                <h3 className="mt-1 text-base font-bold text-[#052767] dark:text-white">Password change karein</h3>
              </div>
              <button type="button" onClick={() => setPasswordOpen(false)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17} /></button>
            </div>
            <div className="space-y-3 p-5">
              {[
                { label: "Purana password", value: currentPassword, change: setCurrentPassword },
                { label: "Naya password", value: newPassword, change: setNewPassword },
                { label: "Naya password dobara", value: confirmPassword, change: setConfirmPassword },
              ].map((field) => (
                <label key={field.label} className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {field.label}
                  <input
                    type="password"
                    required
                    value={field.value}
                    onChange={(event) => { field.change(event.target.value); setError(""); }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              ))}
              <p className="text-[10px] leading-relaxed text-slate-400">Kam az kam 8 characters, aik letter aur aik number.</p>
              {error && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <button type="button" onClick={() => setPasswordOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
              <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#052767] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                {busy && <Loader2 size={13} className="animate-spin" />} Save password
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

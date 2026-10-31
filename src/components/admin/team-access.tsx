"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle, Check, CheckCircle2, Copy, KeyRound, Loader2, Lock, Pencil, Plus, RefreshCw,
  ShieldAlert, ShieldCheck, Trash2, UserRound, Users, X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useWorkspaces } from "@/context/workspace-context";
import type { StaffAccountView } from "@/lib/auth/account";
import { ROLE_DESCRIPTION, ROLE_LABEL, STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";

const input =
  "mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

const ROLE_BADGE: Record<StaffRole, string> = {
  owner: "bg-[#052767] text-white",
  manager: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  reception: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const PERMISSION_ROWS: { label: string; owner: boolean; manager: boolean; reception: boolean }[] = [
  { label: "Dashboard & bookings dekhna", owner: true, manager: true, reception: true },
  { label: "Naya booking / walk-in add karna", owner: true, manager: true, reception: true },
  { label: "Booking status (complete / cancel)", owner: true, manager: true, reception: true },
  { label: "Recovery inbox & waitlist", owner: true, manager: true, reception: true },
  { label: "Staff aur branches dekhna", owner: true, manager: true, reception: true },
  { label: "Booking edit karna", owner: true, manager: true, reception: false },
  { label: "Reports / CSV export", owner: true, manager: true, reception: false },
  { label: "Customer add, edit ya delete karna", owner: true, manager: false, reception: false },
  { label: "Booking delete karna", owner: true, manager: false, reception: false },
  { label: "Salon setup & services", owner: true, manager: false, reception: false },
  { label: "Staff logins banana / reset karna", owner: true, manager: false, reception: false },
];

type Draft = {
  id?: string;
  displayName: string;
  email: string;
  role: StaffRole;
  salonId: string;
  branchId: string;
  password: string;
  isActive: boolean;
};

const emptyDraft = (salonId: string, role: StaffRole = "reception"): Draft => ({
  displayName: "",
  email: "",
  role,
  salonId,
  branchId: "",
  password: "",
  isActive: true,
});

function randomPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let body = "";
  bytes.forEach((byte) => { body += alphabet[byte % alphabet.length]; });
  return `${body}${(bytes[0] % 9) + 1}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TeamAccess() {
  const { user } = useAuth();
  const { workspaces, activeWorkspace } = useWorkspaces();
  const [accounts, setAccounts] = useState<StaffAccountView[]>([]);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffAccountView | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StaffAccountView | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/team", { cache: "no-store" });
      const data = (await response.json()) as {
        accounts?: StaffAccountView[];
        storageWarning?: string | null;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Staff list load nahi hui.");
        setAccounts([]);
      } else {
        setAccounts(data.accounts ?? []);
        setStorageWarning(data.storageWarning ?? null);
      }
    } catch {
      setError("Network error — staff list load nahi hui.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetching the staff list on mount is the intended external-system sync here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const activeCount = useMemo(() => accounts.filter((account) => account.isActive).length, [accounts]);

  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: draft.displayName,
          email: draft.email,
          role: draft.role,
          salonId: draft.role === "owner" ? null : draft.salonId,
          branchId: draft.role === "owner" ? null : draft.branchId,
          password: draft.password,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Login create nahi hua.");
        return;
      }
      setNotice(`${draft.email} ka login ban gaya (${ROLE_LABEL[draft.role]}).`);
      setDraft(null);
      await load();
    } catch {
      setError("Network error — dobara koshish karein.");
    } finally {
      setSaving(false);
    }
  };

  const patchAccount = async (id: string, patch: Record<string, unknown>, successMessage: string) => {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Update nahi hua.");
        return false;
      }
      setNotice(successMessage);
      await load();
      return true;
    } catch {
      setError("Network error — dobara koshish karein.");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft?.id) return;
    setSaving(true);
    const ok = await patchAccount(
      draft.id,
      { displayName: draft.displayName, email: draft.email, role: draft.role, salonId: draft.role === "owner" ? null : draft.salonId, branchId: draft.role === "owner" ? null : draft.branchId, isActive: draft.isActive },
      "Login details update ho gayin.",
    );
    setSaving(false);
    if (ok) setDraft(null);
  };

  const applyReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!resetTarget) return;
    setSaving(true);
    const ok = await patchAccount(resetTarget.id, { password: resetPassword }, `${resetTarget.email} ka password reset ho gaya.`);
    setSaving(false);
    if (ok) {
      setResetTarget(null);
      setResetPassword("");
    }
  };

  const removeAccount = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError("");
    try {
      const response = await fetch(`/api/team/${deleteTarget.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Delete nahi hua.");
        return;
      }
      setNotice(`${deleteTarget.email} ka login delete ho gaya.`);
      setDeleteTarget(null);
      await load();
    } catch {
      setError("Network error — dobara koshish karein.");
    } finally {
      setBusyId(null);
    }
  };

  const copyHint = async (email: string, password: string) => {
    try {
      await navigator.clipboard.writeText(`${email} / ${password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Copy nahi hua — credentials manually likh lein.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-[.15em] text-emerald-700 dark:text-emerald-400">Access control · owner only</span>
          <h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Team logins & permissions</h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400">
            Manager ya reception ke liye login banayein. Wo sirf apne login se andar aa sakte hain, aur unhe wahi
            sections aur sirf wohi specific branch dikhti hai jo aap assign karein. Password reset aur delete sirf owner ke paas hai.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-200">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => { setDraft(emptyDraft(activeWorkspace.id)); setError(""); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1CA830] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#178e29]">
            <Plus size={14} /> Naya login
          </button>
        </div>
      </div>

      {storageWarning && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldAlert size={15} className="mt-0.5 shrink-0" />
          <span>
            <strong>Staff logins abhi temporary storage mein hain.</strong> {storageWarning} Permanent logins ke liye
            Vercel par <code className="rounded bg-white/60 px-1">DATABASE_URL</code> (Supabase connection string) add karein —
            table khud ban jati hai, koi manual SQL nahi chahiye.
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 size={14} /> {notice}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total logins", value: accounts.length, icon: Users },
          { label: "Active logins", value: activeCount, icon: ShieldCheck },
          { label: "Aap ka role", value: ROLE_LABEL[user.role], icon: Lock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#050d21]">
            <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-400"><Icon size={12} /> {label}</span>
            <strong className="mt-2 block text-lg font-extrabold text-[#052767] dark:text-white">{value}</strong>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21]">
        <div className="hidden grid-cols-[1.6fr_.7fr_.7fr_1fr_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 lg:grid">
          <span>Staff member</span><span>Role</span><span>Status</span><span>Last login</span><span className="text-right">Actions</span>
        </div>

        {loading && accounts.length === 0 && (
          <div className="flex items-center justify-center gap-2 p-10 text-xs font-semibold text-slate-400"><Loader2 size={16} className="animate-spin" /> Staff logins load ho rahe hain…</div>
        )}

        {!loading && accounts.length === 0 && (
          <div className="p-10 text-center text-xs text-slate-400">Koi login nahi mila. “Naya login” se manager ya reception add karein.</div>
        )}

        {accounts.map((account) => {
          const isSelf = account.id === user.id;
          return (
            <div key={account.id} className="grid gap-3 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800 lg:grid-cols-[1.6fr_.7fr_.7fr_1fr_auto] lg:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-[#052767] dark:bg-slate-800 dark:text-emerald-300">
                  {account.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-xs text-slate-800 dark:text-white">
                    {account.displayName} {isSelf && <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Aap</span>}
                  </strong>
                  <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{account.email}</span>
                  <span className="block truncate text-[9px] text-emerald-700 dark:text-emerald-400">{account.role === "owner" ? "All salons / branches" : `${workspaces.find((workspace) => workspace.id === account.salonId)?.settings.name ?? "Salon not assigned / deleted"} · ${workspaces.find((workspace) => workspace.id === account.salonId)?.settings.branches.find((branch) => branch.id === account.branchId)?.name ?? "Branch not assigned / deleted"}`}</span>
                  <span className="mt-0.5 block text-[9px] text-slate-400 lg:hidden">
                    {ROLE_LABEL[account.role]} · {account.isActive ? "Active" : "Disabled"} · Last login {formatDate(account.lastLoginAt)}
                  </span>
                </span>
              </div>

              <div className="hidden lg:block">
                <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${ROLE_BADGE[account.role]}`}>{ROLE_LABEL[account.role]}</span>
              </div>

              <div className="hidden lg:block">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${account.isActive ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${account.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {account.isActive ? "Active" : "Disabled"}
                </span>
              </div>

              <div className="hidden text-[10px] text-slate-500 dark:text-slate-400 lg:block">{formatDate(account.lastLoginAt)}</div>

              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <button
                  onClick={() => { setDraft({ id: account.id, displayName: account.displayName, email: account.email, role: account.role, salonId: account.salonId ?? "", branchId: account.branchId ?? "", password: "", isActive: account.isActive }); setError(""); }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-200"
                >
                  <Pencil size={11} /> Edit
                </button>
                <button
                  onClick={() => { setResetTarget(account); setResetPassword(randomPassword()); setError(""); }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-200"
                >
                  <KeyRound size={11} /> Password
                </button>
                <button
                  disabled={busyId === account.id || isSelf}
                  onClick={() => void patchAccount(account.id, { isActive: !account.isActive }, account.isActive ? `${account.email} ka access band kar diya.` : `${account.email} ka access wapas on kar diya.`)}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold disabled:opacity-40 ${account.isActive ? "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300"}`}
                >
                  {account.isActive ? <><Lock size={11} /> Disable</> : <><Check size={11} /> Enable</>}
                </button>
                <button
                  disabled={busyId === account.id || isSelf}
                  onClick={() => { setDeleteTarget(account); setError(""); }}
                  aria-label={`Delete ${account.email}`}
                  className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-rose-300 hover:text-rose-700 disabled:opacity-40 dark:border-slate-700"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21]">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Role permissions</span>
          <h3 className="mt-1 text-sm font-bold text-[#052767] dark:text-white">Kaun kya kar sakta hai</h3>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Reception ke paas delete, reports aur salon setup ka access nahi hota. Manager delete aur staff logins manage nahi kar sakta.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[11px]">
            <thead className="bg-slate-50 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Action</th>
                {STAFF_ROLES.map((role) => <th key={role} className="px-4 py-2.5 text-center">{ROLE_LABEL[role]}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{row.label}</td>
                  {STAFF_ROLES.map((role) => (
                    <td key={role} className="px-4 py-2.5 text-center">
                      {row[role]
                        ? <Check size={13} className="mx-auto text-emerald-600" />
                        : <X size={13} className="mx-auto text-slate-300 dark:text-slate-600" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="grid gap-2 sm:grid-cols-3">
            {STAFF_ROLES.map((role) => (
              <div key={role} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <strong className="block text-[10px] text-[#052767] dark:text-white">{ROLE_LABEL[role]}</strong>
                <span className="mt-1 block text-[9px] leading-relaxed text-slate-500 dark:text-slate-400">{ROLE_DESCRIPTION[role]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Create / edit modal */}
      {draft && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
          <form onSubmit={draft.id ? saveEdit : createAccount} className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#050d21]">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">{draft.id ? "Edit login" : "Naya staff login"}</span>
                <h3 className="mt-1 text-lg font-bold text-[#052767] dark:text-white">{draft.id ? draft.displayName || draft.email : "Manager / reception access"}</h3>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Role ke mutabiq sections aur buttons khud adjust ho jate hain.</p>
              </div>
              <button type="button" onClick={() => setDraft(null)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17} /></button>
            </div>
            <div className="max-h-[65vh] space-y-3 overflow-y-auto p-5">
              {!draft.id && (
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Staff ka naam
                  <input required value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} placeholder="e.g. Ayesha Khan" className={input} />
                </label>
              )}
              {draft.id && (
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Staff ka naam
                  <input required value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} className={input} />
                </label>
              )}
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Login email
                <input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="reception@glowsalon.pk" className={input} />
              </label>
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Role / access level</span>
                <div className="mt-1 space-y-1.5">
                  {STAFF_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setDraft({ ...draft, role })}
                      className={`w-full rounded-xl border p-2.5 text-left transition ${draft.role === role ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/10 dark:bg-emerald-950/30" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <strong className="text-[11px] text-[#052767] dark:text-white">{ROLE_LABEL[role]}</strong>
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${draft.role === role ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                          {draft.role === role && <Check size={10} />}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[9px] leading-relaxed text-slate-500 dark:text-slate-400">{ROLE_DESCRIPTION[role]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {draft.role !== "owner" && <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Assigned salon
                  <select required value={draft.salonId} onChange={(event) => setDraft({ ...draft, salonId: event.target.value, branchId: "" })} className={input}>
                    <option value="">Salon select karein</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.settings.name}</option>)}
                  </select>
                </label>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Assigned branch
                  <select required value={draft.branchId} onChange={(event) => setDraft({ ...draft, branchId: event.target.value })} className={input}>
                    <option value="">Branch select karein</option>{workspaces.find((workspace) => workspace.id === draft.salonId)?.settings.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </label>
                <p className="text-[10px] leading-relaxed text-slate-500 sm:col-span-2">Manager / reception ko sirf isi branch ka dashboard aur records milenge; doosri branches nahi khulengi.</p>
              </div>}
              {draft.role === "owner" && <p className="rounded-lg bg-amber-50 p-2 text-[10px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Owner ko sab salons aur login management ka poora access milega.</p>}
              {!draft.id && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Password
                    <div className="flex gap-1.5">
                      <input required value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="Kam az kam 8 characters" className={input} />
                      <button type="button" onClick={() => setDraft({ ...draft, password: randomPassword() })} className="mt-1 shrink-0 rounded-lg border border-slate-200 px-2.5 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Generate</button>
                    </div>
                  </label>
                  <button type="button" onClick={() => void copyHint(draft.email, draft.password)} className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Credentials copy karein</>}
                  </button>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-400">Password staff ko dein — wo sign in ke baad khud change kar sakta hai.</p>
                </div>
              )}

              {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-[11px] font-semibold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
              {draft.id && (
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} className="h-4 w-4 accent-emerald-600" />
                  Login active hai (uncheck = access band)
                </label>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1CA830] px-4 py-2 text-xs font-bold text-white hover:bg-[#178e29] disabled:opacity-60">
                {saving && <Loader2 size={13} className="animate-spin" />} {draft.id ? "Save changes" : "Login banayein"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password reset modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
          <form onSubmit={applyReset} className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#050d21]">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Owner reset</span>
                <h3 className="mt-1 text-base font-bold text-[#052767] dark:text-white">Naya password</h3>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{resetTarget.email}</p>
              </div>
              <button type="button" onClick={() => setResetTarget(null)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17} /></button>
            </div>
            <div className="space-y-2 p-5">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Naya password
                <div className="flex gap-1.5">
                  <input required value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} className={input} />
                  <button type="button" onClick={() => setResetPassword(randomPassword())} className="mt-1 shrink-0 rounded-lg border border-slate-200 px-2.5 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Generate</button>
                </div>
              </label>
              <button type="button" onClick={() => void copyHint(resetTarget.email, resetPassword)} className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
              </button>
              <p className="text-[10px] leading-relaxed text-slate-400">Reset ke baad staff ko naya password batayein. Purana password foran band ho jata hai.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <button type="button" onClick={() => setResetTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#052767] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                {saving && <Loader2 size={13} className="animate-spin" />} Reset password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#050d21]">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"><Trash2 size={16} /></span>
              <div>
                <h3 className="text-sm font-bold text-[#052767] dark:text-white">Login delete karein?</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{deleteTarget.displayName} ({deleteTarget.email}) ka access foran band ho jayega. Ye wapas nahi aayega — sirf naya login bana sakte hain.</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Nahi</button>
              <button onClick={() => void removeAccount()} disabled={busyId === deleteTarget.id} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                {busyId === deleteTarget.id && <Loader2 size={13} className="animate-spin" />} Haan, delete
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <UserRound size={11} /> Signed in as {user.email} · {ROLE_LABEL[user.role]} · storage: {user.backend === "database" ? "database" : "temporary"}
      </p>
    </div>
  );
}

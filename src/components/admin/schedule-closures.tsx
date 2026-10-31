"use client";

import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useWorkspaces } from "@/context/workspace-context";
import { formatClockTime, parseClockTime } from "@/lib/booking-schedule";
import type { ScheduleBlock, ScheduleBlockReason, ScheduleBlockScope } from "@/types/salon";

const inputClass = "mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const labelClass = "block text-[11px] font-bold text-slate-600 dark:text-slate-300";

type BlockDraft = { dateISO: string; stylistId?: string; time?: string };

function timeInputValue(time: string | undefined, fallback: number): string {
  const minute = time ? parseClockTime(time) : fallback;
  const value = minute ?? fallback;
  return `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

/** Create a salon, branch or staff closure, including holidays and timed breaks. */
export function ScheduleBlockDialog({ draft, onClose }: { draft: BlockDraft; onClose: () => void }) {
  const { activeWorkspace, activeBranchId, addScheduleBlock } = useWorkspaces();
  const { user, demo } = useAuth();
  const owner = demo || user.role === "owner";
  const settings = activeWorkspace.settings;
  const [scope, setScope] = useState<ScheduleBlockScope>(draft.stylistId ? "staff" : activeBranchId === "all" ? "salon" : "branch");
  const [branchId, setBranchId] = useState(activeBranchId === "all" ? settings.branches[0]?.id ?? "" : activeBranchId);
  const [stylistId, setStylistId] = useState(draft.stylistId ?? settings.stylists[0]?.id ?? "");
  const [startDate, setStartDate] = useState(draft.dateISO);
  const [endDate, setEndDate] = useState(draft.dateISO);
  const [allDay, setAllDay] = useState(!draft.time);
  const [startTime, setStartTime] = useState(timeInputValue(draft.time, 11 * 60));
  const [endTime, setEndTime] = useState(timeInputValue(undefined, (parseClockTime(draft.time ?? "") ?? 11 * 60) + 60));
  const [reason, setReason] = useState<ScheduleBlockReason>(draft.stylistId ? "Staff leave" : "Holiday");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    formRef.current?.querySelector<HTMLElement>("select")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingRef.current) { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab" || !formRef.current) return;
      const focusable = Array.from(formRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (!formRef.current.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; triggerRef.current?.focus(); };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (savingRef.current) return;
    setError("");
    if (!startDate || !endDate || endDate < startDate) { setError("Start aur end date sahi chunein."); return; }
    if (scope === "branch" && !branchId) { setError("Branch select karein."); return; }
    if (scope === "staff" && !stylistId) { setError("Staff member select karein."); return; }
    const start = parseClockTime(startTime); const end = parseClockTime(endTime);
    if (!allDay && (start === null || end === null || (end <= start && !(end === 0 && start > 0)))) {
      setError("End time, start time ke baad hona chahiye (12:00 AM tak)."); return;
    }
    const block: ScheduleBlock = {
      id: `BL-${crypto.randomUUID()}`, scope,
      ...(scope === "branch" || (scope === "staff" && !owner) ? { branchId } : {}),
      ...(scope === "staff" ? { stylistId } : {}),
      startDate, endDate, allDay, ...(!allDay ? { startTime, endTime } : {}),
      reason, ...(note.trim() ? { note: note.trim() } : {}), createdAt: new Date().toISOString(),
    };
    savingRef.current = true; setSaving(true);
    const result = await addScheduleBlock(block);
    savingRef.current = false; setSaving(false);
    if (result.ok) onClose();
    else setError(result.message ?? "Time off save nahi hua.");
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="schedule-block-title">
      <form ref={formRef} onSubmit={(event) => void submit(event)} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#050d21]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
          <div><span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-400">Schedule control</span><h3 id="schedule-block-title" className="mt-1 text-lg font-extrabold text-[#052767] dark:text-white">Close time / add holiday</h3><p className="mt-1 text-[11px] text-slate-500">Salon, branch ya staff ke liye off time set karein.</p></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close time off dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <label className={labelClass}>Close for<select value={scope} onChange={(event) => setScope(event.target.value as ScheduleBlockScope)} className={inputClass}>{owner && <option value="salon">Entire salon (all branches)</option>}<option value="branch">One branch</option><option value="staff">One staff member ({owner ? "all branches" : "this branch"})</option></select></label>
          {scope === "branch" && <label className={labelClass}>Branch<select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={inputClass}>{settings.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
          {scope === "staff" && <label className={labelClass}>Staff member<select value={stylistId} onChange={(event) => setStylistId(event.target.value)} className={inputClass}>{settings.stylists.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}{staff.branchId ? ` · ${settings.branches.find((branch) => branch.id === staff.branchId)?.name ?? ""}` : " · all branches"}</option>)}</select></label>}
          <div className="grid grid-cols-2 gap-3"><label className={labelClass}>From date<input required type="date" value={startDate} onChange={(event) => { const value = event.target.value; setStartDate(value); if (endDate < value) setEndDate(value); }} className={inputClass} /></label><label className={labelClass}>Through date<input required type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass} /></label></div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} className="accent-emerald-600" /> All day</label>
          {!allDay && <><div className="grid grid-cols-2 gap-3"><label className={labelClass}>From time<input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} /></label><label className={labelClass}>Until time<input required type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClass} /></label></div><p className="text-[10px] text-slate-500">Ye time range har selected date par apply hogi; 12:00 AM end of day hai.</p></>}
          <label className={labelClass}>Reason<select value={reason} onChange={(event) => setReason(event.target.value as ScheduleBlockReason)} className={inputClass}><option>Holiday</option><option>Staff leave</option><option>Maintenance</option><option>Other</option></select></label>
          <label className={labelClass}>Note (optional)<input value={note} maxLength={160} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Eid holiday or equipment repair" className={inputClass} /></label>
          <p className="rounded-xl bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Is waqt ki existing booking pehle reschedule ya cancel karein. Closed time par nayi booking allow nahi hogi.</p>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
          <div className="flex gap-2"><button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-200">Cancel</button><button type="submit" disabled={saving} className="flex-1 rounded-lg bg-amber-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50">{saving ? "Saving…" : "Save time off"}</button></div>
        </div>
      </form>
    </div>
  );
}

/** A compact, on-demand place to manage closures without cluttering the grid. */
export function ScheduleClosureList({ selectedDate, onAdd }: { selectedDate: string; onAdd: () => void }) {
  const { activeWorkspace, activeBranchId, removeScheduleBlock } = useWorkspaces();
  const { can, user, demo } = useAuth();
  const [reopening, setReopening] = useState<string | null>(null);
  const settings = activeWorkspace.settings;
  const blocks = (activeWorkspace.scheduleBlocks ?? []).filter((block) => {
    if (activeBranchId === "all" || block.scope === "salon") return true;
    if (block.scope === "branch") return block.branchId === activeBranchId;
    const staff = settings.stylists.find((item) => item.id === block.stylistId);
    return !!staff && (!staff.branchId || staff.branchId === activeBranchId) && (!block.branchId || block.branchId === activeBranchId);
  });
  const scopeLabel = (block: ScheduleBlock) => block.scope === "salon" ? "Entire salon" : block.scope === "branch" ? settings.branches.find((branch) => branch.id === block.branchId)?.name ?? "Branch" : settings.stylists.find((staff) => staff.id === block.stylistId)?.name ?? "Staff";
  const timeLabel = (block: ScheduleBlock) => block.allDay ? "All day" : `${formatClockTime(parseClockTime(block.startTime ?? "") ?? 0)}–${formatClockTime(parseClockTime(block.endTime ?? "") ?? 0)}`;
  const reopen = async (id: string) => {
    if (reopening) return;
    setReopening(id);
    await removeScheduleBlock(id);
    setReopening(null);
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Weekly off: {settings.offDays.length ? settings.offDays.join(", ") : "none"}</p>
        {can("schedule.manage") && <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Plus size={11} /> Add time off</button>}
      </div>
      {blocks.length === 0 ? <p className="text-[10px] text-slate-400">No extra time off scheduled.</p> : <div className="space-y-1.5">
        {blocks.map((block) => <div key={block.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <div className="min-w-0 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300"><strong>{block.reason} · {scopeLabel(block)}</strong><span className="ml-1">{block.startDate}{block.endDate !== block.startDate ? ` – ${block.endDate}` : ""} · {timeLabel(block)}{block.note ? ` · ${block.note}` : ""}{block.startDate <= selectedDate && block.endDate >= selectedDate ? " · selected day" : ""}</span></div>
          {can("schedule.manage") && (demo || user.role === "owner" || (block.branchId === activeBranchId && block.scope !== "salon")) && <button type="button" disabled={!!reopening} onClick={() => void reopen(block.id)} aria-label={`Reopen ${block.reason} for ${scopeLabel(block)} from ${block.startDate}`} className="rounded-lg border border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">{reopening === block.id ? "Reopening…" : "Reopen"}</button>}
        </div>)}
      </div>}
    </div>
  );
}

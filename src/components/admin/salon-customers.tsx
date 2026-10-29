"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Mail,
  PhoneCall,
  Search,
  Sparkles,
  Star,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useSalon } from "@/context/salon-context";
import { WhatsAppLink } from "@/components/admin/booking-table";

const currency = (amount: number) => `PKR ${amount.toLocaleString("en-PK")}`;
const masked = (phone: string) => `•••• ${phone.replace(/\D/g, "").slice(-4)}`;

/** Build a professional customer profile from repeat-client memory + booking history. */
export default function SalonCustomers() {
  const { repeatCustomers, bookings, settings } = useSalon();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"visits" | "value" | "name">("value");
  const [selected, setSelected] = useState<string | null>(null);

  const profiles = useMemo(() => {
    const known = repeatCustomers.map((customer) => {
      const history = bookings.filter(
        (booking) => booking.customerName.toLowerCase() === customer.name.toLowerCase() && booking.status !== "cancelled"
      );
      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        lastService: customer.lastService,
        lastVisitDate: customer.lastVisitDate,
        visits: Math.max(customer.totalVisits, history.length),
        preferredStylist: customer.preferredStylist,
        notes: customer.notes ?? "",
        spend: history.reduce((sum, booking) => sum + booking.amountPKR, 0),
        bookings: history,
        isKnown: true,
      };
    });

    // Include walk-in / one-off customers that are not in the repeat-memory list.
    const knownNames = new Set(known.map((profile) => profile.name.toLowerCase()));
    const extras = Array.from(
      new Map(
        bookings
          .filter((booking) => !knownNames.has(booking.customerName.toLowerCase()))
          .map((booking) => [booking.customerName.toLowerCase(), booking])
      ).values()
    ).map((booking) => {
      const history = bookings.filter(
        (row) => row.customerName.toLowerCase() === booking.customerName.toLowerCase() && row.status !== "cancelled"
      );
      return {
        id: `guest-${booking.customerName.toLowerCase().replace(/\s+/g, "-")}`,
        name: booking.customerName,
        phone: booking.customerPhone,
        lastService: booking.serviceName,
        lastVisitDate: booking.date,
        visits: history.length,
        preferredStylist: booking.stylistName,
        notes: "Single-visit guest in the sample register.",
        spend: history.reduce((sum, row) => sum + row.amountPKR, 0),
        bookings: history,
        isKnown: false,
      };
    });

    const all = [...known, ...extras];
    const filtered = all.filter((profile) => {
      const search = query.trim().toLowerCase();
      if (!search) return true;
      return (
        profile.name.toLowerCase().includes(search) ||
        profile.preferredStylist.toLowerCase().includes(search) ||
        profile.lastService.toLowerCase().includes(search)
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "visits") return b.visits - a.visits;
      return b.spend - a.spend;
    });
  }, [repeatCustomers, bookings, query, sortBy]);

  const totalSpend = profiles.reduce((sum, profile) => sum + profile.spend, 0);
  const repeatCount = profiles.filter((profile) => profile.visits > 1).length;
  const topProfile = profiles[0];
  const selectedProfile = profiles.find((profile) => profile.id === selected) ?? null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300">Client directory · sample data</span>
          <h2 className="mt-1 text-xl font-bold text-[#052767] dark:text-white">Customers</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Repeat customers, unki booking history, pasandida stylist aur total spend — masked contact numbers ke saath.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Total customers", value: String(profiles.length), icon: Users, tint: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
          { label: "Repeat clients", value: String(repeatCount), icon: Sparkles, tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
          { label: "Sample client value", value: currency(totalSpend), icon: Wallet, tint: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" },
          { label: "Top client", value: topProfile ? topProfile.name.split(" ")[0] : "—", icon: Star, tint: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
        ].map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-[#050d21]">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint}`}><Icon size={15} /></span>
            <strong className="mt-2.5 block truncate text-lg font-extrabold text-[#052767] dark:text-white">{value}</strong>
            <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#050d21] sm:flex-row">
        <label className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Customer, stylist ya service se search karein…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "visits" | "value" | "name")} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <option value="value">Sort: highest value</option>
          <option value="visits">Sort: most visits</option>
          <option value="name">Sort: name (A–Z)</option>
        </select>
      </div>

      {/* Professional table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#050d21]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                {["Customer", "Contact", "Last service", "Preferred stylist", "Visits", "Sample spend", ""].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-extrabold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {profiles.map((profile) => (
                <tr key={profile.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#052767] to-[#1CA830] text-[10px] font-extrabold text-white">
                        {profile.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                      </span>
                      <div className="min-w-0">
                        <strong className="block truncate text-slate-800 dark:text-white">{profile.name}</strong>
                        <span className="block text-[9px] text-slate-400">{profile.isKnown ? "Repeat client" : "Single visit"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <WhatsAppLink phone={profile.phone} message={`Assalam o alaikum ${profile.name}! ${settings.name} se baat ho rahi hai.`} />
                  </td>
                  <td className="max-w-[190px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">{profile.lastService}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{profile.preferredStylist}</td>
                  <td className="px-4 py-3 font-bold text-[#052767] dark:text-white">{profile.visits}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-400">{currency(profile.spend)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(profile.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-200">
                      Profile <ArrowRight size={11} />
                    </button>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Koi customer match nahi hua.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer profile drawer */}
      {selectedProfile && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#050d21] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#052767] to-[#1CA830] text-sm font-extrabold text-white">
                  {selectedProfile.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                </span>
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Customer profile · sample</span>
                  <h3 className="mt-0.5 text-lg font-bold text-[#052767] dark:text-white">{selectedProfile.name}</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400"><WhatsAppLink phone={selectedProfile.phone} message={`Assalam o alaikum ${selectedProfile.name}! ${settings.name} se baat ho rahi hai.`} /> · {selectedProfile.isKnown ? "repeat client" : "single visit"}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close profile"><X size={16} /></button>
            </div>

            <div className="grid grid-cols-3 gap-px bg-slate-100 text-center dark:bg-slate-800">
              {[
                ["Visits", String(selectedProfile.visits)],
                ["Sample spend", currency(selectedProfile.spend)],
                ["Stylist", selectedProfile.preferredStylist.split(" ")[0]],
              ].map(([label, value]) => (
                <div key={label} className="bg-white p-3 dark:bg-[#050d21]">
                  <strong className="block truncate text-sm font-extrabold text-[#052767] dark:text-white">{value}</strong>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400">{label}</span>
                </div>
              ))}
            </div>

            <div className="max-h-[45vh] space-y-3 overflow-y-auto p-5">
              <div className="rounded-xl bg-slate-50 p-3 text-[11px] dark:bg-slate-900">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Notes</span>
                <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-200">{selectedProfile.notes || "Koi note nahi."}</p>
              </div>

              <div>
                <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400"><CalendarDays size={11} /> Booking history ({selectedProfile.bookings.length})</span>
                <div className="mt-2 space-y-1.5">
                  {selectedProfile.bookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2.5 text-[11px] dark:border-slate-800">
                      <span className="min-w-0">
                        <strong className="block truncate text-slate-800 dark:text-slate-100">{booking.serviceName}</strong>
                        <span className="text-[9px] text-slate-400">{booking.date} · {booking.time} · {booking.stylistName}</span>
                      </span>
                      <span className="shrink-0 font-bold text-emerald-700 dark:text-emerald-400">{currency(booking.amountPKR)}</span>
                    </div>
                  ))}
                  {selectedProfile.bookings.length === 0 && <p className="text-[10px] text-slate-400">Is sample session mein koi booking nahi.</p>}
                </div>
              </div>

              <p className="rounded-lg bg-amber-50 p-2.5 text-[10px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                SAMPLE DATA · {settings.name}. Contact numbers masked; no WhatsApp or SMS is sent from this demo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Booking,
  RepeatCustomer,
  SalonSettings,
  Service,
  ViewTab,
  WaitlistEntry,
} from "@/types/salon";
import { bookingDuration, bookingReference, findBookingConflict, type ScheduleClosure, type SlotCheckOptions } from "@/lib/booking-schedule";
import {
  INITIAL_BOOKINGS,
  INITIAL_REPEAT_CUSTOMERS,
  INITIAL_SALON_SETTINGS,
  INITIAL_WAITLIST,
} from "@/lib/constants";

export interface SalonContextType {
  // Navigation
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;

  // Settings
  settings: SalonSettings;
  updateSettings: (newSettings: Partial<SalonSettings>) => void;
  resetSettings: () => void;

  // Bookings & Recovery
  bookings: Booking[];
  addBooking: (booking: Booking) => Promise<{ ok: boolean; message?: string }>;
  cancelBooking: (bookingId: string) => void;
  completeBooking: (bookingId: string) => void;
  /** Returns the conflicting booking for a stylist/date/time, or null when the slot is free. */
  findSlotConflict: (stylistName: string, date: string, time: string, excludeId?: string, options?: SlotCheckOptions) => Booking | null;
  /** Edits any booking field (incl. custom price). Blocks a slot already taken by another client. */
  updateBooking: (bookingId: string, patch: Partial<Booking>) => Promise<{ ok: boolean; message?: string }>;
  /** Permanently removes a booking from the register. */
  deleteBooking: (bookingId: string) => void;
  /** Human readable slot state for UI: free | booked with details. */
  checkSlotAvailability: (
    stylistName: string,
    date: string,
    time: string,
    options?: SlotCheckOptions
  ) => { available: boolean; conflict?: Booking; closure?: ScheduleClosure; message?: string };
  waitlist: WaitlistEntry[];
  addWaitlistEntry: (entry: WaitlistEntry) => void;
  offerWaitlistEntry: (entryId: string) => void;
  confirmWaitlistBooking: (entryId: string) => void;
  repeatCustomers: RepeatCustomer[];

  // Statistics
  recoveredCount: number;
  recoveredRevenuePKR: number;

  // Owner Overrides & Branching
  ownerOverride: boolean;
  setOwnerOverride: (val: boolean) => void;
  toggleOwnerOverride: () => void;

  // Modals & Banners
  consultationModalOpen: boolean;
  setConsultationModalOpen: (val: boolean) => void;
  selectedPlanForConsultation: string;
  openConsultationWithPlan: (planName?: string) => void;
  morningBriefOpen: boolean;
  setMorningBriefOpen: (val: boolean) => void;

  // Notifications
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Theme
  theme: "light" | "dark" | "system";
  setTheme: (t: "light" | "dark" | "system") => void;

  // CSV
  exportCsv: () => void;
}

export const SalonContext = createContext<SalonContextType | undefined>(undefined);

type SiteTheme = "light" | "dark" | "system";
const THEME_EVENT = "wordbitx-theme-change";
let fallbackTheme: SiteTheme = "dark";
let themeStorageAvailable = true;

// The browser's saved preference is an external store. This keeps the server
// render deterministic and also syncs theme changes between browser tabs.
function getThemeSnapshot(): SiteTheme {
  if (!themeStorageAvailable) return fallbackTheme;
  try {
    const saved = window.localStorage.getItem("wordbitx-theme");
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "dark";
  } catch {
    themeStorageAvailable = false;
    return fallbackTheme;
  }
}
function subscribeToTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}
function getServerThemeSnapshot(): SiteTheme { return "dark"; }

export function SalonProvider({
  children,
  initialTab = "home",
}: {
  children: ReactNode;
  initialTab?: ViewTab;
}) {
  const [activeTab, setActiveTab] = useState<ViewTab>(initialTab);
  const [settingsState, setSettings] = useState<SalonSettings>(INITIAL_SALON_SETTINGS);
  // The salon name/area are owner-editable and intentionally blank by default, so
  // every consumer gets a readable placeholder until the profile is filled in.
  const settings = useMemo<SalonSettings>(() => ({
    ...settingsState,
    name: settingsState.name.trim() || "Your salon",
    area: settingsState.area.trim() || settingsState.city,
  }), [settingsState]);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(INITIAL_WAITLIST);
  const [repeatCustomers] = useState<RepeatCustomer[]>(INITIAL_REPEAT_CUSTOMERS);
  const [ownerOverride, setOwnerOverride] = useState<boolean>(false);

  // Modals
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [selectedPlanForConsultation, setSelectedPlanForConsultation] = useState("Growth Plan (Most Popular)");
  const [morningBriefOpen, setMorningBriefOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // The reference design opens in dark mode; an existing user choice still wins.
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    // During hydration the server snapshot may precede a saved browser choice.
    // Wait for the browser snapshot so we never overwrite the saved preference.
    if (theme !== getThemeSnapshot()) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      if (resolved === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = (t: SiteTheme) => {
    fallbackTheme = t;
    try { window.localStorage.setItem("wordbitx-theme", t); } catch { themeStorageAvailable = false; }
    window.dispatchEvent(new Event(THEME_EVENT));
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = t === "system" ? (systemDark ? "dark" : "light") : t;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.classList.toggle("light", resolved === "light");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  const openConsultationWithPlan = (planName?: string) => {
    if (planName) setSelectedPlanForConsultation(planName);
    setConsultationModalOpen(true);
  };

  const updateSettings = (newSettings: Partial<SalonSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast("✨ Salon settings update ho gayin! Chat aur Dashboard live sync ho gaye.");
  };

  const resetSettings = () => {
    setSettings(INITIAL_SALON_SETTINGS);
    setBookings(INITIAL_BOOKINGS);
    setWaitlist(INITIAL_WAITLIST);
    showToast("Salon profile reset to the default workspace values.");
  };

  const addBooking = async (booking: Booking) => {
    const conflict = findSlotConflict(booking.stylistName, booking.date, booking.time, undefined, { stylistId: booking.stylistId, durationMinutes: bookingDuration(booking, settings.services) });
    if (conflict) {
      const message = `${booking.date} ${booking.time} already booked hai (${conflict.customerName}). Koi aur slot chunein.`;
      showToast(message);
      return { ok: false, message };
    }
    setBookings((prev) => [booking, ...prev]);
    showToast(`✅ +1 Booking Recovered! Added to Owner Dashboard: ${booking.serviceName} (PKR ${booking.amountPKR.toLocaleString()})`);
    return { ok: true };
  };

  const cancelBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b))
    );

    const nextWaitlistEntry = waitlist.find((entry) => entry.status === "waiting");
    if (nextWaitlistEntry) {
      setWaitlist((prev) =>
        prev.map((entry) =>
          entry.id === nextWaitlistEntry.id ? { ...entry, status: "offered" } : entry
        )
      );
      showToast(
        `Vacated slot offered to ${nextWaitlistEntry.customerName}. Booking tab confirm hogi jab customer accept karega.`
      );
    } else {
      showToast("Booking cancelled. Is service ke liye waitlist par koi customer nahi hai.");
    }
  };

  const offerWaitlistEntry = (entryId: string) => {
    const entry = waitlist.find((item) => item.id === entryId);
    if (!entry || entry.status !== "waiting") return;
    setWaitlist((prev) => prev.map((item) => item.id === entryId ? { ...item, status: "offered" } : item));
    showToast(`${entry.serviceName} ka available slot ${entry.customerName} ko offer kiya gaya. WhatsApp send nahi hua.`);
  };

  const confirmWaitlistBooking = (entryId: string) => {
    const entry = waitlist.find((item) => item.id === entryId);
    if (!entry || entry.status !== "offered") return;
    const service = settings.services.find((item) => item.name === entry.serviceName);
    const booking: Booking = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      salonId: settings.id,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      serviceId: service?.id,
      serviceName: entry.serviceName,
      stylistName: settings.stylists[0]?.name || "Hina Malik",
      branchName: settings.branches[0]?.name || "Main branch",
      date: entry.preferredDate,
      time: entry.preferredTime,
      status: "confirmed",
      amountPKR: service?.pricePKR ?? 0,
      channel: "waitlist",
      createdAt: new Date().toISOString(),
      isRecovered: true,
      notes: "Waitlist slot confirmed by the owner.",
    };
    setBookings((prev) => [booking, ...prev]);
    setWaitlist((prev) => prev.map((item) => item.id === entryId ? { ...item, status: "booked" } : item));
    showToast(`${entry.customerName} ne waitlist slot accept kiya. Booking dashboard mein add hui.`);
  };

  const completeBooking = (bookingId: string) => {
    const target = bookings.find((b) => b.id === bookingId);
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "completed" } : b))
    );
    showToast(`${target?.customerName || "Customer"} ki service complete mark hui. Review request preview tayyar hai — WhatsApp message send nahi hua.`);
  };

  const updateBooking = async (bookingId: string, patch: Partial<Booking>) => {
    const current = bookings.find((booking) => booking.id === bookingId);
    if (!current) return { ok: false, message: "Booking nahi mili." };
    const next: Booking = { ...current, ...patch };
    const slotChanged =
      next.stylistName !== current.stylistName || next.stylistId !== current.stylistId || next.date !== current.date || next.time !== current.time || next.serviceId !== current.serviceId || next.serviceName !== current.serviceName;
    const reactivated = current.status === "cancelled" && next.status !== "cancelled";
    if (next.status !== "cancelled" && (slotChanged || reactivated)) {
      const conflict = findSlotConflict(next.stylistName, next.date, next.time, bookingId, { stylistId: next.stylistId, durationMinutes: bookingDuration(next, settings.services) });
      if (conflict) {
        return {
          ok: false,
          message: `Ye slot already booked hai — ${conflict.customerName} (${conflict.date} · ${conflict.time}). Doosra slot chunein, ya client ko WhatsApp par contact karein.`,
        };
      }
    }
    setBookings((prev) => prev.map((booking) => (booking.id === bookingId ? next : booking)));
    showToast(`✏️ Booking ${bookingId} update ho gayi — ${next.customerName}, PKR ${next.amountPKR.toLocaleString("en-PK")}.`);
    return { ok: true };
  };

  const deleteBooking = (bookingId: string) => {
    const target = bookings.find((booking) => booking.id === bookingId);
    setBookings((prev) => prev.filter((booking) => booking.id !== bookingId));
    showToast(`🗑️ Booking delete ho gayi${target ? ` — ${target.customerName}` : ""}.`);
  };

  const addWaitlistEntry = (entry: WaitlistEntry) => {
    setWaitlist((prev) => [entry, ...prev]);
  };

  const findSlotConflict: SalonContextType["findSlotConflict"] = (stylistName, date, time, excludeId, options) =>
    findBookingConflict(bookings, settings.services, stylistName, date, time, excludeId, options);

  const checkSlotAvailability: SalonContextType["checkSlotAvailability"] = (stylistName, date, time, options) => {
    const conflict = findSlotConflict(stylistName, date, time, undefined, options);
    if (!conflict) return { available: true };
    return {
      available: false,
      conflict,
      message: `Ye slot already booked hai — ${conflict.customerName} ka ${conflict.serviceName} (${conflict.time}). Koi aur slot chunein.`,
    };
  };

  const toggleOwnerOverride = () => {
    setOwnerOverride((prev) => {
      const next = !prev;
      showToast(
        next
          ? "🛡️ Owner Takeover ON: Assistant chup hai — aap chat mein khud reply karein."
          : "🤖 AI Assistant Resumed: Automatic responses re-activated."
      );
      return next;
    });
  };

  const exportCsv = () => {
    const headers = [
      "booking_id",
      "salon_id",
      "customer_name",
      "customer_phone",
      "service",
      "amount_pkr",
      "date",
      "time",
      "stylist",
      "channel",
      "status",
      "recovered",
    ];

    const rows = bookings.map((b) => [
      bookingReference(b),
      b.salonId,
      b.customerName,
      `••••${b.customerPhone.replace(/\D/g, "").slice(-4)}`,
      b.serviceName,
      b.amountPKR.toString(),
      b.date,
      b.time,
      b.stylistName,
      b.channel,
      b.status,
      b.isRecovered ? "true" : "false",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((val) => `"${val.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `wordbitx-salon-recovery-audit-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("📥 Verified Recovery CSV Export downloaded!");
  };

  const recoveredList = bookings.filter(
    (b) => b.isRecovered && b.status !== "cancelled"
  );
  const recoveredCount = recoveredList.length;
  const recoveredRevenuePKR = recoveredList.reduce(
    (sum, b) => sum + (b.amountPKR || 0),
    0
  );

  return (
    <SalonContext.Provider
      value={{
        activeTab,
        setActiveTab,
        settings,
        updateSettings,
        resetSettings,
        bookings,
        addBooking,
        cancelBooking,
        completeBooking,
        findSlotConflict,
        checkSlotAvailability,
        updateBooking,
        deleteBooking,
        waitlist,
        addWaitlistEntry,
        offerWaitlistEntry,
        confirmWaitlistBooking,
        repeatCustomers,
        recoveredCount,
        recoveredRevenuePKR,
        ownerOverride,
        setOwnerOverride,
        toggleOwnerOverride,
        consultationModalOpen,
        setConsultationModalOpen,
        selectedPlanForConsultation,
        openConsultationWithPlan,
        morningBriefOpen,
        setMorningBriefOpen,
        toastMessage,
        showToast,
        theme,
        setTheme,
        exportCsv,
      }}
    >
      {children}
    </SalonContext.Provider>
  );
}

export function useSalon() {
  const context = useContext(SalonContext);
  if (!context) {
    throw new Error("useSalon must be used within a SalonProvider");
  }
  return context;
}

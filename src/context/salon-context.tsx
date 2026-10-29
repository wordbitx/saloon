"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
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
import {
  INITIAL_BOOKINGS,
  INITIAL_REPEAT_CUSTOMERS,
  INITIAL_SALON_SETTINGS,
  INITIAL_WAITLIST,
} from "@/lib/constants";

interface SalonContextType {
  // Navigation
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;

  // Settings
  settings: SalonSettings;
  updateSettings: (newSettings: Partial<SalonSettings>) => void;
  resetSettings: () => void;

  // Bookings & Recovery
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  cancelBooking: (bookingId: string) => void;
  completeBooking: (bookingId: string) => void;
  /** Returns the conflicting booking for a stylist/date/time, or null when the slot is free. */
  findSlotConflict: (stylistName: string, date: string, time: string, excludeId?: string) => Booking | null;
  /** Edits any booking field (incl. custom price). Blocks a slot already taken by another client. */
  updateBooking: (bookingId: string, patch: Partial<Booking>) => { ok: boolean; message?: string };
  /** Permanently removes a booking from the sample register. */
  deleteBooking: (bookingId: string) => void;
  /** Human readable slot state for UI: free | booked with details. */
  checkSlotAvailability: (
    stylistName: string,
    date: string,
    time: string
  ) => { available: boolean; conflict?: Booking; message?: string };
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

const SalonContext = createContext<SalonContextType | undefined>(undefined);

export function SalonProvider({
  children,
  initialTab = "home",
}: {
  children: ReactNode;
  initialTab?: ViewTab;
}) {
  const [activeTab, setActiveTab] = useState<ViewTab>(initialTab);
  const [settings, setSettings] = useState<SalonSettings>(INITIAL_SALON_SETTINGS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(INITIAL_WAITLIST);
  const [repeatCustomers] = useState<RepeatCustomer[]>(INITIAL_REPEAT_CUSTOMERS);
  const [ownerOverride, setOwnerOverride] = useState<boolean>(false);

  // Modals
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [selectedPlanForConsultation, setSelectedPlanForConsultation] = useState("Growth Plan (Most Popular)");
  const [morningBriefOpen, setMorningBriefOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme (Light default per user request)
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("light");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("wordbitx-theme") : null;
    if (saved === "dark" || saved === "light" || saved === "system") {
      setThemeState(saved);
    } else {
      setThemeState("light");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
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
    window.localStorage.setItem("wordbitx-theme", theme);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = (t: "light" | "dark" | "system") => {
    setThemeState(t);
    if (typeof window === "undefined") return;
    window.localStorage.setItem("wordbitx-theme", t);
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
    showToast("Glow Salon sample settings reset to defaults.");
  };

  const addBooking = (booking: Booking) => {
    const conflict = findSlotConflict(booking.stylistName, booking.date, booking.time);
    if (conflict) {
      showToast(
        `SAMPLE: ${booking.date} ${booking.time} already booked hai (${conflict.customerName}). WhatsApp par contact karein ya koi aur slot chunein.`
      );
      return;
    }
    setBookings((prev) => [booking, ...prev]);
    showToast(`✅ +1 Booking Recovered! Added to Owner Dashboard: ${booking.serviceName} (PKR ${booking.amountPKR.toLocaleString()})`);
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
        `SAMPLE: Vacated slot offered to ${nextWaitlistEntry.customerName}. Booking tab confirm hogi jab customer accept karega.`
      );
    } else {
      showToast("SAMPLE: Booking cancelled. Is service ke liye waitlist par koi customer nahi hai.");
    }
  };

  const offerWaitlistEntry = (entryId: string) => {
    const entry = waitlist.find((item) => item.id === entryId);
    if (!entry || entry.status !== "waiting") return;
    setWaitlist((prev) => prev.map((item) => item.id === entryId ? { ...item, status: "offered" } : item));
    showToast(`SAMPLE: ${entry.serviceName} ka available slot ${entry.customerName} ko offer kiya gaya. WhatsApp send nahi hua.`);
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
      branchName: settings.branches[0]?.name || "DHA Phase 5",
      date: entry.preferredDate,
      time: entry.preferredTime,
      status: "confirmed",
      amountPKR: service?.pricePKR ?? 0,
      channel: "waitlist",
      createdAt: new Date().toISOString(),
      isRecovered: true,
      notes: "SAMPLE DATA: waitlist customer acceptance simulated by owner.",
    };
    setBookings((prev) => [booking, ...prev]);
    setWaitlist((prev) => prev.map((item) => item.id === entryId ? { ...item, status: "booked" } : item));
    showToast(`SAMPLE: ${entry.customerName} ne waitlist slot accept kiya. Booking dashboard mein add hui.`);
  };

  const completeBooking = (bookingId: string) => {
    const target = bookings.find((b) => b.id === bookingId);
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "completed" } : b))
    );
    showToast(`SAMPLE: ${target?.customerName || "Customer"} ki service complete mark hui. Review request preview tayyar hai — WhatsApp message send nahi hua.`);
  };

  const updateBooking = (bookingId: string, patch: Partial<Booking>) => {
    const current = bookings.find((booking) => booking.id === bookingId);
    if (!current) return { ok: false, message: "Booking nahi mili." };
    const next: Booking = { ...current, ...patch };
    const slotChanged =
      next.stylistName !== current.stylistName || next.date !== current.date || next.time !== current.time;
    const reactivated = current.status === "cancelled" && next.status !== "cancelled";
    if (next.status !== "cancelled" && (slotChanged || reactivated)) {
      const conflict = findSlotConflict(next.stylistName, next.date, next.time, bookingId);
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

  /**
   * A stylist can only hold one chair at one time. Compare the clock hour so
   * "04:30 PM" and "4:30 PM" are treated as the same slot.
   */
  const toHour = (time: string): number | null => {
    const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!match) return null;
    let hour = Number(match[1]) % 12;
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === "PM") hour += 12;
    else if (!meridiem && hour < 8) hour += 12; // "Now"/walk-in style entries
    return hour;
  };

  const findSlotConflict = (stylistName: string, date: string, time: string, excludeId?: string): Booking | null => {
    const targetHour = toHour(time);
    return (
      bookings.find((booking) => {
        if (booking.status === "cancelled") return false;
        if (excludeId && booking.id === excludeId) return false;
        if (booking.stylistName !== stylistName) return false;
        if (booking.date !== date) return false;
        const bookingHour = toHour(booking.time);
        if (targetHour === null || bookingHour === null) return false;
        return bookingHour === targetHour;
      }) ?? null
    );
  };

  const checkSlotAvailability = (stylistName: string, date: string, time: string) => {
    const conflict = findSlotConflict(stylistName, date, time);
    if (!conflict) return { available: true };
    return {
      available: false,
      conflict,
      message: `Ye slot already booked hai — ${conflict.customerName} ka ${conflict.serviceName} (${conflict.time}). Same time par dobara book karne ke liye WhatsApp par contact karein, ya koi aur slot chunein.`,
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
      b.id,
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

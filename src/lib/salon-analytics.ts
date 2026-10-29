import type { Booking, SalonSettings, ServiceCategory, WaitlistEntry } from "@/types/salon";

/** A drill-down definition: which bookings to show when a dashboard item is clicked. */
export type DrillSpec = {
  title: string;
  subtitle?: string;
  /** Start with "Aaj" scope instead of "Sab din". */
  defaultToday?: boolean;
  filter: (booking: Booking) => boolean;
};

export const CATEGORY_ORDER: ServiceCategory[] = ["Hair", "Skin & Facial", "Makeup & Bridal", "Nails"];

export const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  Hair: "Hair & colour",
  "Skin & Facial": "Skin & facial",
  "Makeup & Bridal": "Bridal & glam",
  Nails: "Nails & spa",
};

export const CATEGORY_IMAGE: Record<ServiceCategory, string> = {
  Hair: "/images/salon-hair-stylist.jpg",
  "Skin & Facial": "/images/salon-facial-treatment.jpg",
  "Makeup & Bridal": "/images/salon-bridal-makeup.jpg",
  Nails: "/images/salon-nails-spa.jpg",
};

export const SLOT_TIMES = [
  "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM",
];

export const isActive = (booking: Booking) => booking.status !== "cancelled";
export const isToday = (booking: Booking) => booking.date === "Today";
export const money = (amount: number) => `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
export const sumAmount = (rows: Booking[]) => rows.reduce((total, row) => total + row.amountPKR, 0);

/** Service category of a booking — from the salon menu, with keyword fallback for walk-ins. */
export function categoryForBooking(booking: Booking, settings: SalonSettings): ServiceCategory {
  const service = settings.services.find((item) => item.name === booking.serviceName);
  if (service) return service.category;
  const text = booking.serviceName.toLowerCase();
  if (/bridal|makeup|barat|walima|glam/.test(text)) return "Makeup & Bridal";
  if (/facial|hydra|skin|glow/.test(text)) return "Skin & Facial";
  if (/nail|mani|pedi/.test(text)) return "Nails";
  return "Hair";
}

/** Today's category cards: count, revenue and the services inside each category. */
export function categorySummary(bookings: Booking[], settings: SalonSettings) {
  return CATEGORY_ORDER.map((category) => {
    const rows = bookings.filter(
      (booking) => isActive(booking) && isToday(booking) && categoryForBooking(booking, settings) === category
    );
    const services = settings.services
      .filter((service) => service.category === category)
      .map((service) => {
        const serviceRows = rows.filter((row) => row.serviceName === service.name);
        return { name: service.name, price: service.pricePKR, count: serviceRows.length, revenue: sumAmount(serviceRows) };
      });
    return {
      category,
      label: CATEGORY_LABEL[category],
      image: CATEGORY_IMAGE[category],
      count: rows.length,
      revenue: sumAmount(rows),
      services,
    };
  });
}

/** Headline and tile numbers for the overview — every value comes from live state. */
export function overviewMetrics(bookings: Booking[], waitlist: WaitlistEntry[]) {
  const active = bookings.filter(isActive);
  const today = active.filter(isToday);
  const todayRecovered = today.filter((booking) => booking.isRecovered);
  const recovered = active.filter((booking) => booking.isRecovered);
  return {
    todayTotal: today.length,
    todayConfirmed: today.filter((booking) => booking.status === "confirmed").length,
    todayRecoveredCount: todayRecovered.length,
    todayRecoveredValue: sumAmount(todayRecovered),
    recoveredCount: recovered.length,
    recoveredValue: sumAmount(recovered),
    waitingCount: waitlist.filter((entry) => entry.status === "waiting").length,
    completedCount: bookings.filter((booking) => booking.status === "completed").length,
  };
}

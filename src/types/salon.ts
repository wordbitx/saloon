export type ServiceCategory = "Hair" | "Skin & Facial" | "Makeup & Bridal" | "Nails";

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  pricePKR: number;
  description: string;
}

export interface Stylist {
  id: string;
  name: string;
  specialty: string;
  availableDays: string[];
}

export interface Branch {
  id: string;
  name: string;
  area: string;
}

export interface SalonSettings {
  id: string;
  name: string;
  city: string;
  area: string;
  address: string;
  phone: string;
  openingTime: string;
  closingTime: string;
  offDays: string[];
  greetingMessage: string;
  repeatGreetingTemplate: string;
  googleReviewUrl: string;
  services: Service[];
  stylists: Stylist[];
  branches: Branch[];
  activeBranchId: string;
}

export interface RepeatCustomer {
  id: string;
  salonId: string;
  name: string;
  phone: string;
  lastVisitDate: string;
  lastService: string;
  totalVisits: number;
  preferredStylist: string;
  notes?: string;
}

export interface WaitlistEntry {
  id: string;
  salonId: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  preferredDate: string;
  preferredTime: string;
  status: "waiting" | "offered" | "booked";
  createdAt: string;
}

export interface Booking {
  id: string;
  salonId: string;
  customerName: string;
  customerPhone: string;
  serviceId?: string;
  serviceName: string;
  stylistId?: string;
  stylistName: string;
  branchName?: string;
  date: string;
  time: string;
  status: "confirmed" | "completed" | "cancelled";
  amountPKR: number;
  channel: "whatsapp_night" | "missed_call" | "overflow_peak" | "waitlist" | "direct";
  createdAt: string;
  isRecovered: boolean;
  notes?: string;
}

export interface PricingPlan {
  id: "starter" | "growth" | "business";
  name: string;
  subtitle: string;
  pricePKR: number;
  priceUSD: number;
  popular: boolean;
  summary: string;
  features: string[];
}

export type ViewTab =
  | "home"
  | "simulator"
  | "dashboard"
  | "pricing"
  | "settings"
  | "tenant-lab";

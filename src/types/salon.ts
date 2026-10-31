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
  /** Assigned branch. Profiles without one are available in all branches. */
  branchId?: string;
  /** Resized image data; never an external URL. */
  photoDataUrl?: string;
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
  branchId?: string;
  name: string;
  phone: string;
  lastVisitDate: string;
  lastService: string;
  totalVisits: number;
  preferredStylist: string;
  notes?: string;
  /** Old names retain the link to historical name-only appointments after an edit. */
  aliases?: string[];
}

export interface WaitlistEntry {
  id: string;
  salonId: string;
  branchId?: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  /** Public form requests remain pending until staff manually confirm. */
  source?: "website";
  serviceId?: string;
  preferredDate: string;
  preferredTime: string;
  status: "waiting" | "offered" | "booked" | "declined";
  createdAt: string;
}

export type ScheduleBlockScope = "salon" | "branch" | "staff";
export type ScheduleBlockReason = "Holiday" | "Staff leave" | "Maintenance" | "Other";

/** An explicitly closed period in one salon's schedule. End date is inclusive. */
export interface ScheduleBlock {
  id: string;
  scope: ScheduleBlockScope;
  branchId?: string;
  stylistId?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  reason: ScheduleBlockReason;
  note?: string;
  createdAt: string;
}

export interface Booking {
  /** Stable internal key, retained for edits, status changes and old records. */
  id: string;
  /** Short, salon-local reference allocated atomically by the workspace. */
  reference?: string;
  salonId: string;
  customerName: string;
  customerPhone: string;
  serviceId?: string;
  serviceName: string;
  /** Service duration recorded at booking time; old records use the current menu. */
  durationMinutes?: number;
  stylistId?: string;
  stylistName: string;
  branchId?: string;
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

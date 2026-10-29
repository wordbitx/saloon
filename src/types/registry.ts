export type SalonImageKind = "logo" | "interior" | "team" | "service" | "other";

export interface RegisteredSalonImage {
  id: string;
  name: string;
  kind: SalonImageKind;
  /** Data URL for the preview session. Real uploads need Supabase Storage. */
  dataUrl: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface RegisteredSalon {
  id: string;
  salonName: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  area: string;
  address: string;
  branches: { name: string; area: string }[];
  staff: { name: string; specialty: string }[];
  services: { name: string; category: string; pricePKR: number; durationMinutes: number }[];
  openingTime: string;
  closingTime: string;
  offDays: string[];
  googleReviewUrl: string;
  images: RegisteredSalonImage[];
  status: "draft" | "submitted";
  createdAt: string;
}

export const SAMPLE_REGISTERED_SALONS: RegisteredSalon[] = [
  {
    id: "salon-reg-glow-dha",
    salonName: "Glow Salon, Lahore",
    ownerName: "Demo Owner",
    phone: "0300 0000000",
    whatsapp: "0300 0000000",
    email: "owner@glowsalon.example",
    city: "Lahore",
    area: "DHA Phase 5",
    address: "Plot 42-C, Sector CCA, DHA Phase 5, Lahore",
    branches: [
      { name: "DHA Phase 5 (Flagship)", area: "Sector CCA, DHA Phase 5" },
      { name: "Gulberg III Branch", area: "Near M.M. Alam Road, Gulberg III" },
    ],
    staff: [
      { name: "Hina Malik", specialty: "Master Hair Colorist & Balayage" },
      { name: "Sana Tariq", specialty: "Senior Hair Stylist & Cuts" },
      { name: "Zainab Bilal", specialty: "Clinical Esthetician (Facials)" },
      { name: "Aliya Noor", specialty: "Bridal & Event Glam" },
    ],
    services: [
      { name: "Balayage & Hair Gloss", category: "Hair", pricePKR: 16500, durationMinutes: 120 },
      { name: "HydraFacial Deep Glow", category: "Skin & Facial", pricePKR: 7500, durationMinutes: 60 },
      { name: "Signature Haircut & Blowdry", category: "Hair", pricePKR: 3500, durationMinutes: 45 },
      { name: "Signature Bridal Makeup", category: "Makeup & Bridal", pricePKR: 45000, durationMinutes: 180 },
    ],
    openingTime: "11:00 AM",
    closingTime: "09:00 PM",
    offDays: ["Monday"],
    googleReviewUrl: "",
    images: [
      {
        id: "img-sample-1",
        name: "salon-interior-hero.jpg",
        kind: "interior",
        dataUrl: "/images/salon-interior-hero.jpg",
        sizeBytes: 433000,
        uploadedAt: "2026-10-28T09:00:00Z",
      },
    ],
    status: "submitted",
    createdAt: "2026-10-28T08:45:00Z",
  },
];

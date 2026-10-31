export const PRODUCT_CATEGORIES = ["Hair care", "Skin care", "Makeup", "Nails & spa", "Accessories", "Other"] as const;
export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

/** Catalog belongs to one salon; draft products never appear publicly. */
export type SalonProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  pricePKR: number;
  imageDataUrl?: string;
  published: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductDraft = Omit<SalonProduct, "createdAt" | "updatedAt">;

/** This is the entire catalog data made public; no workspace/customer records. */
export type PublicProduct = {
  id: string;
  salonId: string;
  salonName: string;
  city: string;
  isSample: boolean;
  name: string;
  category: ProductCategory;
  description: string;
  pricePKR: number;
  version: number;
  imageUrl?: string;
};

export type ProductOrderStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";

/** A manual request, not a paid transaction or an inventory reservation. */
export type ProductOrder = {
  id: string;
  reference: string;
  requestKey: string;
  productId: string;
  productVersion: number;
  productName: string;
  unitPricePKR: number;
  quantity: number;
  totalPKR: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes: string;
  consent: true;
  status: ProductOrderStatus;
  createdAt: string;
};

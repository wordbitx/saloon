import type { ProductCategory, SalonProduct } from "@/types/shop";

/**
 * Fictional, unbranded examples for the explicitly marked sample salon only.
 * Images, sizes and prices are illustrative, not live inventory or offers.
 */
const items: { id: string; name: string; category: ProductCategory; description: string; pricePKR: number; image: string }[] = [
  { id: "sample-bond-repair-shampoo", name: "Bond Repair Shampoo", category: "Hair care", description: "A salon-inspired shampoo for a gentle, polished hair-care routine. Sample size: 250 ml.", pricePKR: 4500, image: "product-bond-shampoo.jpg" },
  { id: "sample-hydration-serum", name: "Hydration Face Serum", category: "Skin care", description: "A lightweight serum for a fresh, dewy-looking finish. Sample size: 30 ml.", pricePKR: 5200, image: "product-hydration-serum.jpg" },
  { id: "sample-silk-face-primer", name: "Silk Finish Face Primer", category: "Makeup", description: "A smooth-feel primer for a refined makeup base. Sample size: 30 ml.", pricePKR: 3850, image: "product-face-primer.jpg" },
  { id: "sample-cuticle-care-oil", name: "Nourishing Cuticle Oil", category: "Nails & spa", description: "An everyday finishing oil for a neat-looking manicure. Sample size: 15 ml.", pricePKR: 2250, image: "product-vitamin-serum.jpg" },
  { id: "sample-hydrating-hair-mask", name: "Deep Hydration Hair Mask", category: "Hair care", description: "A rich, salon-inspired conditioning treatment for a soft-feel finish. Sample size: 250 ml.", pricePKR: 5800, image: "product-hair-mask.jpg" },
  { id: "sample-argan-shine-oil", name: "Argan Shine Hair Oil", category: "Hair care", description: "A finishing oil for a glossy, styled look. Sample size: 50 ml.", pricePKR: 4250, image: "product-argan-oil.jpg" },
  { id: "sample-heat-protect-mist", name: "Heat Protect Styling Mist", category: "Hair care", description: "A salon-style mist for your everyday styling routine. Sample size: 150 ml.", pricePKR: 3750, image: "product-heat-mist.jpg" },
  { id: "sample-cream-cleanser", name: "Gentle Cream Cleanser", category: "Skin care", description: "A creamy-feel cleanser for a simple morning or evening routine. Sample size: 150 ml.", pricePKR: 3400, image: "product-cream-cleanser.jpg" },
  { id: "sample-vitamin-c-serum", name: "Vitamin C Radiance Serum", category: "Skin care", description: "A brightening-look serum inspired by professional facial routines. Sample size: 30 ml.", pricePKR: 5600, image: "product-vitamin-serum.jpg" },
  { id: "sample-moisture-cream", name: "Barrier Moisture Cream", category: "Skin care", description: "A comforting cream for a soft, moisturised-looking finish. Sample size: 50 ml.", pricePKR: 5000, image: "product-moisture-cream.jpg" },
  { id: "sample-setting-mist", name: "Professional Setting Mist", category: "Makeup", description: "A fine facial mist to complete your makeup routine. Sample size: 100 ml.", pricePKR: 3950, image: "product-setting-mist.jpg" },
  { id: "sample-nail-care-serum", name: "Nail Care Serum", category: "Nails & spa", description: "A lightweight nail-care finishing serum for a polished look. Sample size: 15 ml.", pricePKR: 2650, image: "product-hydration-serum.jpg" },
];

const sampleDate = "2026-10-31T00:00:00.000Z";

/** Return fresh objects so editing a workspace never changes the seed template. */
export function sampleProducts(): SalonProduct[] {
  return items.map(({ image, ...product }) => ({ ...product, imageDataUrl: `/images/${image}`, published: true, version: 1, createdAt: sampleDate, updatedAt: sampleDate }));
}

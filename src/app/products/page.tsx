import { listPublicProducts } from "@/lib/workspaces/store";
import ShopCatalog from "@/components/shop/shop-catalog";
import type { PublicProduct } from "@/types/shop";

export const dynamic = "force-dynamic";
export const metadata = { title: "Salon products | WordbitX", description: "Discover products published by our salons and send a manual order request." };

export default async function ProductsPage() {
  let products: PublicProduct[] = [];
  let unavailable = false;
  try { products = await listPublicProducts(); }
  catch (error) { console.error("[shop] catalog unavailable", error); unavailable = true; }
  return <ShopCatalog products={products} unavailable={unavailable} />;
}

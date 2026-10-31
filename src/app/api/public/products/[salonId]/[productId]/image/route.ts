import { publicProductImage } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ salonId: string; productId: string }> }) {
  const { salonId, productId } = await context.params;
  try {
    const image = await publicProductImage(salonId, productId);
    const match = image?.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    return new Response(new Uint8Array(Buffer.from(match[2], "base64")), { headers: { "Content-Type": `image/${match[1]}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[public products] image unavailable", error);
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

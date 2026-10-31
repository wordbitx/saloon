import { NextResponse } from "next/server";
import { listPublicProducts } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json({ products: await listPublicProducts() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[public products] catalog unavailable", error);
    return NextResponse.json({ error: "Products filhaal load nahi ho rahe." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

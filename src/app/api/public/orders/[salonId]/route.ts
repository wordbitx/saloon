import { NextResponse } from "next/server";
import { badRequest, readJson } from "@/lib/auth/api";
import { WorkspaceError } from "@/lib/workspaces/model";
import { submitPublicProductOrder } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";
// Prototype only: process-local limits and forwarded headers are not a WAF.
type Globals = typeof globalThis & { __wbxProductOrderRate?: Map<string, { count: number; expires: number }> };
const rates = ((globalThis as Globals).__wbxProductOrderRate ??= new Map<string, { count: number; expires: number }>());
function limit(key: string, max: number): boolean {
  const now = Date.now();
  for (const [item, value] of rates) if (value.expires <= now) rates.delete(item);
  if (rates.size > 10_000 && !rates.has(key)) return false;
  const current = rates.get(key);
  if (current && current.expires > now) {
    if (current.count >= max) return false;
    current.count += 1;
  } else rates.set(key, { count: 1, expires: now + 15 * 60_000 });
  return true;
}

export async function POST(request: Request, context: { params: Promise<{ salonId: string }> }) {
  const { salonId } = await context.params;
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 100);
  const loopback = ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1";
  const clientKey = ip && !loopback ? `ip:${ip}` : `unidentified:${salonId.slice(0, 100)}`;
  if (!limit(clientKey, 25) || !limit(`salon:${salonId.slice(0, 100)}`, 200)) {
    return NextResponse.json({ error: "Bohat requests aa rahi hain. Kuch dair baad try karein." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "900" } });
  }
  const body = await readJson<Record<string, unknown>>(request, 8_000);
  if (!body) return badRequest("Order request padhi nahi ja saki.");
  if (body.website) return NextResponse.json({ ok: true, reference: "" }, { headers: { "Cache-Control": "no-store" } });
  try {
    const result = await submitPublicProductOrder(salonId, body);
    return NextResponse.json({ ok: true, reference: result.reference }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof WorkspaceError) return badRequest(error.message, error.status);
    console.error("[public order] request failed", error);
    return badRequest("Order request save nahi hui. Salon se rabta karein.", 500);
  }
}

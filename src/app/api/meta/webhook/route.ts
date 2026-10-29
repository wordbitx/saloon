import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

/**
 * Phase 2 only — no demo UI calls this endpoint.
 * Configure it in Meta after business verification and approved templates.
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && challenge && verifyToken && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }
  return Response.json({ error: "Webhook verification is not configured." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const enabled = process.env.WHATSAPP_CLOUD_API_ENABLED === "true";
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // Before Phase 2 activation, acknowledge the endpoint without parsing,
  // storing, logging, or echoing any potentially sensitive message content.
  if (!enabled) {
    return Response.json({ received: true, processed: false, mode: "phase_2_stub" });
  }

  if (!appSecret || !validSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 403 });
  }

  // TODO (owner decision): normalize verified webhook events, use the signed-in
  // tenant mapping, and persist them through Drizzle only after Phase 2 review.
  return Response.json({ received: true, processed: false, mode: "awaiting_owner_event_policy" });
}

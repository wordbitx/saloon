import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Phase 1 deliberately exposes no tenant records over an unauthenticated API.
 * This makes a cross-salon direct request return 403 with no row data.
 *
 * TODO (owner decision): activate this route only after Supabase Auth server
 * session verification is configured; query through RLS as the authenticated user.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ salonId: string }> }) {
  await context.params;
  return Response.json(
    { error: "Tenant booking API is unavailable until authenticated Supabase access is configured." },
    { status: 403 },
  );
}

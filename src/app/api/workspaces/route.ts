import { NextResponse } from "next/server";
import { badRequest, guard, readJson } from "@/lib/auth/api";
import { normalizeProfile, WorkspaceError } from "@/lib/workspaces/model";
import { addWorkspace, workspacesFor } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await guard("bookings.view");
  if (result.error) return result.error;
  try {
    return NextResponse.json({ workspaces: await workspacesFor(result.user) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[workspaces] list failed", error);
    return badRequest("Salons load nahi hue. Storage check karein.", 500);
  }
}

/** Only an owner may add a salon. Records start empty, not copied from the sample. */
export async function POST(request: Request) {
  const result = await guard("registry.manage");
  if (result.error) return result.error;
  const body = await readJson<{ profile?: unknown }>(request);
  if (!body) return badRequest("Request padhi nahi ja saki.");
  try {
    const profile = normalizeProfile(body.profile);
    const workspace = await addWorkspace(profile);
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    if (error instanceof WorkspaceError) return badRequest(error.message, error.status);
    console.error("[workspaces] create failed", error);
    return badRequest("Salon save nahi hua. Storage check karein.", 500);
  }
}

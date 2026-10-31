import { NextResponse } from "next/server";
import { badRequest, guard, readJson } from "@/lib/auth/api";
import { normalizeProfile, WorkspaceError } from "@/lib/workspaces/model";
import { scopeWorkspace } from "@/lib/workspaces/access";
import { canAccessWorkspace, deleteWorkspace, getWorkspace, updateWorkspaceProfile } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const result = await guard("bookings.view");
  if (result.error) return result.error;
  const { id } = await context.params;
  if (!canAccessWorkspace(result.user, id)) return badRequest("Is salon ki permission nahi hai.", 403);
  try {
    const workspace = await getWorkspace(id);
    if (!workspace) return badRequest("Salon nahi mila.", 404);
    const scoped = scopeWorkspace(workspace, result.user);
    return scoped ? NextResponse.json({ workspace: scoped }, { headers: { "Cache-Control": "no-store" } }) : badRequest("Is branch ki permission nahi hai.", 403);
  } catch (error) {
    console.error("[workspaces] read failed", error);
    return badRequest("Salon load nahi hua.", 500);
  }
}

export async function PUT(request: Request, context: Params) {
  const result = await guard("registry.manage");
  if (result.error) return result.error;
  const { id } = await context.params;
  const body = await readJson<{ profile?: unknown }>(request);
  if (!body) return badRequest("Request padhi nahi ja saki.");
  try {
    const workspace = await updateWorkspaceProfile(id, normalizeProfile(body.profile));
    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof WorkspaceError) return badRequest(error.message, error.status);
    console.error("[workspaces] update failed", error);
    return badRequest("Salon update nahi hua. Storage check karein.", 500);
  }
}

export async function DELETE(_request: Request, context: Params) {
  const result = await guard("registry.manage");
  if (result.error) return result.error;
  const { id } = await context.params;
  try {
    await deleteWorkspace(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WorkspaceError) return badRequest(error.message, error.status);
    console.error("[workspaces] delete failed", error);
    return badRequest("Salon delete nahi hua. Storage check karein.", 500);
  }
}

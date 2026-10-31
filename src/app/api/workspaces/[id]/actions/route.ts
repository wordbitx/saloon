import { NextResponse } from "next/server";
import { badRequest, guard, readJson } from "@/lib/auth/api";
import { hasCapability } from "@/lib/auth/roles";
import { ACTION_PERMISSIONS } from "@/lib/workspaces/access";
import { WorkspaceError } from "@/lib/workspaces/model";
import { applyWorkspaceAction, canAccessWorkspace } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await guard();
  if (result.error) return result.error;
  const { id } = await context.params;
  if (!canAccessWorkspace(result.user, id)) return badRequest("Is salon ki permission nahi hai.", 403);
  const body = await readJson<{ action?: { type?: string } }>(request);
  const type = body?.action?.type;
  const capability = typeof type === "string" ? ACTION_PERMISSIONS[type] : undefined;
  if (!capability) return badRequest("Unknown workspace action.");
  if (!hasCapability(result.user.role, capability)) return badRequest("Aap ke role ke paas is action ki permission nahi hai.", 403);
  try {
    const workspace = await applyWorkspaceAction(id, body?.action, result.user);
    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof WorkspaceError) return badRequest(error.message, error.status);
    console.error("[workspaces] action failed", error);
    return badRequest("Action save nahi hua. Storage check karein.", 500);
  }
}

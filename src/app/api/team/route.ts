import { NextResponse } from "next/server";
import { badRequest, guard, readJson } from "@/lib/auth/api";
import { passwordProblem } from "@/lib/auth/password";
import { hasCapability, isStaffRole } from "@/lib/auth/roles";
import { AuthStoreError, createStaffAccount, getAuthBackendInfo, listStaffAccounts } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

/** List staff logins. Owner-only. */
export async function GET() {
  const result = await guard("team.manage");
  if (result.error) return result.error;

  const [accounts, backend] = await Promise.all([listStaffAccounts(), getAuthBackendInfo()]);
  return NextResponse.json({
    accounts,
    backend: backend.mode,
    storageWarning: backend.mode === "memory" ? backend.error ?? "Staff accounts are stored in memory only." : null,
  });
}

/** Create a manager / reception / additional owner login. Owner-only. */
export async function POST(request: Request) {
  const result = await guard("team.manage");
  if (result.error) return result.error;
  const actor = result.user;

  const body = await readJson<{
    email?: string;
    displayName?: string;
    role?: string;
    password?: string;
  }>(request);

  const role = body?.role;
  if (!isStaffRole(role)) return badRequest("Role chunein: owner, manager ya reception.");
  if (role === "owner" && !hasCapability(actor.role, "team.assignOwner")) {
    return badRequest("Sirf owner doosra owner bana sakta hai.", 403);
  }
  const password = body?.password ?? "";
  const problem = passwordProblem(password);
  if (problem) return badRequest(problem);

  try {
    const account = await createStaffAccount({
      email: body?.email ?? "",
      displayName: body?.displayName ?? "",
      password,
      role,
      actorEmail: actor.email,
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthStoreError) return badRequest(error.message, error.status);
    console.error("[team] create failed", error);
    return badRequest("Login create nahi hua. Dobara koshish karein.", 500);
  }
}

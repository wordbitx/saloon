import { NextResponse } from "next/server";
import { badRequest, guard, readJson } from "@/lib/auth/api";
import { passwordProblem } from "@/lib/auth/password";
import { hasCapability, isStaffRole } from "@/lib/auth/roles";
import { AuthStoreError, deleteStaffAccount, getStaffAccountById, updateStaffAccount } from "@/lib/auth/store";
import { getWorkspace } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";

/** Update a staff login: name, email, role, active flag, or a new password. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await guard("team.manage");
  if (result.error) return result.error;
  const actor = result.user;
  const { id } = await context.params;

  const body = await readJson<{
    email?: string;
    displayName?: string;
    role?: string;
    salonId?: string | null;
    branchId?: string | null;
    isActive?: boolean;
    password?: string;
  }>(request);
  if (!body) return badRequest("Request padhi nahi ja saki.");

  if (body.role !== undefined) {
    if (!isStaffRole(body.role)) return badRequest("Role owner, manager ya reception hona chahiye.");
    if (body.role === "owner" && !hasCapability(actor.role, "team.assignOwner")) {
      return badRequest("Sirf owner doosra owner bana sakta hai.", 403);
    }
  }
  if (id === actor.id && body.isActive === false) {
    return badRequest("Apna hi account band nahi kar sakte.", 409);
  }
  if (body.password !== undefined) {
    const problem = passwordProblem(body.password);
    if (problem) return badRequest(problem);
  }

  try {
    const current = await getStaffAccountById(id);
    if (!current) return badRequest("Staff account nahi mila.", 404);
    const nextRole = isStaffRole(body.role) ? body.role : current.role;
    const nextSalonId = body.salonId === undefined ? current.salonId : body.salonId;
    const nextBranchId = body.branchId === undefined ? current.branchId : body.branchId;
    // Old unassigned accounts may still be disabled or have their password reset,
    // but cannot access data until an owner assigns a valid salon AND branch.
    if (nextRole !== "owner" && (body.role !== undefined || body.salonId !== undefined || body.branchId !== undefined || body.isActive === true)) {
      const workspace = typeof nextSalonId === "string" ? await getWorkspace(nextSalonId) : null;
      if (!workspace) return badRequest("Manager / reception ke liye ek salon select karein.");
      if (typeof nextBranchId !== "string" || !workspace.settings.branches.some((branch) => branch.id === nextBranchId)) return badRequest("Is salon ki ek specific branch select karein.");
    }
    const account = await updateStaffAccount(id, {
      email: body.email,
      displayName: body.displayName,
      role: isStaffRole(body.role) ? body.role : undefined,
      salonId: body.salonId,
      branchId: body.branchId,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      password: body.password,
    });
    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof AuthStoreError) return badRequest(error.message, error.status);
    console.error("[team] update failed", error);
    return badRequest("Update nahi hua. Dobara koshish karein.", 500);
  }
}

/** Delete a staff login. The last active owner can never be deleted. */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await guard("team.manage");
  if (result.error) return result.error;
  const actor = result.user;
  const { id } = await context.params;

  if (id === actor.id) return badRequest("Apna hi account delete nahi kar sakte. Sign out karke doosre owner se karwayein.", 409);

  try {
    await deleteStaffAccount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthStoreError) return badRequest(error.message, error.status);
    console.error("[team] delete failed", error);
    return badRequest("Delete nahi hua. Dobara koshish karein.", 500);
  }
}

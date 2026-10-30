import { NextResponse } from "next/server";
import { badRequest, guard, readJson } from "@/lib/auth/api";
import { passwordProblem } from "@/lib/auth/password";
import { hasCapability, isStaffRole } from "@/lib/auth/roles";
import { AuthStoreError, deleteStaffAccount, updateStaffAccount } from "@/lib/auth/store";

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
    const account = await updateStaffAccount(id, {
      email: body.email,
      displayName: body.displayName,
      role: isStaffRole(body.role) ? body.role : undefined,
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

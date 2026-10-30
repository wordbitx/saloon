import { NextResponse } from "next/server";
import { badRequest, guard, readJson } from "@/lib/auth/api";
import { passwordProblem } from "@/lib/auth/password";
import { changePassword, AuthStoreError } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

/** Change your own password (current password required). */
export async function PATCH(request: Request) {
  const result = await guard();
  if (result.error) return result.error;
  const user = result.user;

  const body = await readJson<{ currentPassword?: string; newPassword?: string }>(request);
  const currentPassword = body?.currentPassword ?? "";
  const newPassword = body?.newPassword ?? "";
  if (!currentPassword) return badRequest("Purana password likhein.");
  const problem = passwordProblem(newPassword);
  if (problem) return badRequest(problem);

  try {
    await changePassword(user.id, currentPassword, newPassword);
  } catch (error) {
    if (error instanceof AuthStoreError) return badRequest(error.message, error.status);
    return badRequest("Password change nahi hua. Dobara koshish karein.", 500);
  }
  return NextResponse.json({ ok: true });
}

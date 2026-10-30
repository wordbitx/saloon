import { NextResponse } from "next/server";
import { hasCapability, type Capability } from "@/lib/auth/roles";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { getActiveSessionAccount, sessionUserFor } from "@/lib/auth/store";

export type GuardResult = { user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse };

/**
 * Server-side gate for admin APIs: verified session cookie + account still
 * active in the store + the requested capability for the current role.
 */
export async function guard(capability?: Capability): Promise<GuardResult> {
  const session = await getSessionUser();
  if (!session) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  const account = await getActiveSessionAccount(session);
  if (!account) {
    return { error: NextResponse.json({ error: "Ye account band hai. Owner se rabta karein." }, { status: 403 }) };
  }
  const user = await sessionUserFor(account);
  if (capability && !hasCapability(user.role, capability)) {
    return {
      error: NextResponse.json(
        { error: "Aap ke role ke paas is action ki permission nahi hai. Owner se kahein." },
        { status: 403 },
      ),
    };
  }
  return { user };
}

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

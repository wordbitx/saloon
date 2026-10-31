import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isStaffRole, type StaffRole } from "@/lib/auth/roles";

export type AuthBackend = "database" | "memory";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  salonId: string | null;
  branchId: string | null;
  backend: AuthBackend;
};

type TokenPayload = SessionUser & { exp: number };

export const SESSION_COOKIE = "wbx_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

/** A fixed AUTH_SECRET is required for sessions to survive restarts/instances. */
function authSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  // Process-local demos get an unpredictable key, never a public constant or
  // a potentially guessable database URL. Multi-instance deployments must set AUTH_SECRET.
  const globals = globalThis as typeof globalThis & { __wbxEphemeralSessionSecret?: string };
  return (globals.__wbxEphemeralSessionSecret ??= randomBytes(48).toString("base64url"));
}

function sign(payload: string) {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

export function createSessionToken(user: SessionUser, now = Date.now()): string {
  const payload: TokenPayload = { ...user, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (!parsed.exp || parsed.exp * 1000 < Date.now()) return null;
    if (!isStaffRole(parsed.role) || !parsed.id || !parsed.email) return null;
    return {
      id: parsed.id,
      email: parsed.email,
      displayName: parsed.displayName,
      role: parsed.role,
      salonId: typeof parsed.salonId === "string" ? parsed.salonId : null,
      branchId: typeof parsed.branchId === "string" ? parsed.branchId : null,
      backend: parsed.backend === "database" ? "database" : "memory",
    };
  } catch {
    return null;
  }
}

/** Read the signed session for the current request (server components + routes). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

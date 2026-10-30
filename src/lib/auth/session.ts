import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isStaffRole, type StaffRole } from "@/lib/auth/roles";

export type AuthBackend = "database" | "memory";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  backend: AuthBackend;
};

type TokenPayload = SessionUser & { exp: number };

export const SESSION_COOKIE = "wbx_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

/**
 * Signing secret. A dedicated AUTH_SECRET is best; otherwise we derive a
 * deployment-unique value so public demo links cannot forge admin cookies with
 * the fallback constant.
 */
function authSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const seed = [process.env.DATABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.NEXT_PUBLIC_SUPABASE_URL]
    .filter(Boolean)
    .join("|");
  if (seed) return `wbx-derived-${createHash("sha256").update(seed).digest("hex")}`;
  return "wordbitx-local-dev-secret-change-me-in-production";
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

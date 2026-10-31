import { NextResponse } from "next/server";
import { authenticateStaff, sessionUserFor } from "@/lib/auth/store";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Attempt = { count: number; first: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function throttleKey(request: Request, email: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${email.toLowerCase()}::${ip}`;
}

function tooManyAttempts(key: string) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
    return;
  }
  entry.count += 1;
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string } | null = null;
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Request padhi nahi ja saki." }, { status: 400 });
  }

  const email = (body?.email ?? "").trim();
  const password = body?.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email aur password dono likhein." }, { status: 400 });
  }

  const key = throttleKey(request, email);
  if (tooManyAttempts(key)) {
    return NextResponse.json(
      { error: "Bohat zyada ghalat koshishein. 10 minute baad dobara try karein." },
      { status: 429 },
    );
  }

  let account;
  try {
    account = await authenticateStaff(email, password);
  } catch {
    return NextResponse.json({ error: "Staff database available nahi hai. DATABASE_URL check karein aur dobara try karein." }, { status: 503 });
  }
  if (!account) {
    recordFailure(key);
    return NextResponse.json({ error: "Email ya password ghalat hai." }, { status: 401 });
  }

  attempts.delete(key);
  const user = await sessionUserFor(account);
  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
  return response;
}

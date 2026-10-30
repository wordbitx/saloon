import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getActiveSessionAccount, sessionUserFor } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ user: null }, { status: 200 });
  const account = await getActiveSessionAccount(session);
  if (!account) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: await sessionUserFor(account) });
}

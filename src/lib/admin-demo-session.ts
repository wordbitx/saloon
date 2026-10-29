export type DemoAdminRole = "owner" | "manager" | "reception";

export type DemoAdminSession = {
  mode: "demo" | "supabase";
  role: DemoAdminRole;
  displayName: string;
  startedAt: string;
};

const SESSION_KEY = "wordbitx-admin-demo-session";

export function readDemoAdminSession(): DemoAdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoAdminSession;
    if (parsed.mode !== "demo" || !["owner", "manager", "reception"].includes(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createDemoAdminSession(role: DemoAdminRole): DemoAdminSession {
  const displayName = role === "owner" ? "Demo Owner" : role === "manager" ? "Demo Manager" : "Demo Reception";
  const session: DemoAdminSession = {
    mode: "demo",
    role,
    displayName,
    startedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function clearDemoAdminSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
}

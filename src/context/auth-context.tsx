"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { hasCapability, type Capability, type StaffRole } from "@/lib/auth/roles";
import type { AuthBackend } from "@/lib/auth/account";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  salonId: string | null;
  branchId: string | null;
  backend: AuthBackend;
};

export type AuthValue = {
  user: AuthUser;
  /** True when rendered outside a signed-in provider (public /dashboard demo). */
  demo: boolean;
  can: (capability: Capability) => boolean;
  signOut: () => Promise<void>;
};

const DEMO_USER: AuthUser = {
  id: "demo",
  email: "demo@glowsalon.pk",
  displayName: "Salon Owner",
  role: "owner",
  salonId: null,
  branchId: null,
  backend: "memory",
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
  const router = useRouter();

  const signOut = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed");
      router.replace("/");
      router.refresh();
    } catch {
      window.alert("Sign out nahi hua. Connection check karke dobara try karein.");
    }
  }, [router]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      demo: false,
      can: (capability) => hasCapability(user.role, capability),
      signOut,
    }),
    [user, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Components shared with the public demo fall back to full demo-owner access. */
export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (context) return context;
  return {
    user: DEMO_USER,
    demo: true,
    can: (capability) => hasCapability("owner", capability),
    signOut: async () => {
      if (typeof window !== "undefined") window.location.href = "/";
    },
  };
}

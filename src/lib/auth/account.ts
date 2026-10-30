import type { StaffRole } from "@/lib/auth/roles";

/** Wire shape returned by /api/team — never includes the password hash. */
export type StaffAccountView = {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  createdBy: string | null;
};

export type AuthBackend = "database" | "memory";

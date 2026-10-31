/**
 * Shared role + capability model.
 *
 * This file is imported by both server routes and client components, so it must
 * stay free of Node-only imports.
 */

export type StaffRole = "owner" | "manager" | "reception";

export const STAFF_ROLES: StaffRole[] = ["owner", "manager", "reception"];

export const ROLE_LABEL: Record<StaffRole, string> = {
  owner: "Owner / Admin",
  manager: "Manager",
  reception: "Reception",
};

export const ROLE_DESCRIPTION: Record<StaffRole, string> = {
  owner: "Full control — bookings, reports, salon setup, and staff logins.",
  manager: "Day-to-day operations. Can add and edit bookings, but cannot delete or manage logins.",
  reception: "Front desk only. Can view the day, add bookings, mark status and handle inbox/waitlist.",
};

export type Capability =
  | "bookings.view"
  | "bookings.create"
  | "bookings.edit"
  | "bookings.delete"
  | "bookings.status"
  | "schedule.manage"
  | "customers.view"
  | "customers.manage"
  | "inbox.manage"
  | "waitlist.manage"
  | "services.view"
  | "staff.view"
  | "registry.manage"
  | "shop.manage"
  | "reports.view"
  | "settings.manage"
  | "audit.view"
  | "team.manage"
  | "team.assignOwner";

const CAPABILITIES: Record<StaffRole, Capability[]> = {
  owner: [
    "bookings.view",
    "bookings.create",
    "bookings.edit",
    "bookings.delete",
    "bookings.status",
    "schedule.manage",
    "customers.view",
    "customers.manage",
    "inbox.manage",
    "waitlist.manage",
    "services.view",
    "staff.view",
    "registry.manage",
    "shop.manage",
    "reports.view",
    "settings.manage",
    "audit.view",
    "team.manage",
    "team.assignOwner",
  ],
  manager: [
    "bookings.view",
    "bookings.create",
    "bookings.edit",
    "bookings.status",
    "schedule.manage",
    "customers.view",
    "inbox.manage",
    "waitlist.manage",
    "services.view",
    "staff.view",
    "reports.view",
    "audit.view",
  ],
  reception: [
    "bookings.view",
    "bookings.create",
    "bookings.status",
    "schedule.manage",
    "customers.view",
    "inbox.manage",
    "waitlist.manage",
    "services.view",
    "staff.view",
  ],
};

export function hasCapability(role: StaffRole, capability: Capability) {
  return CAPABILITIES[role]?.includes(capability) ?? false;
}

export function capabilitiesFor(role: StaffRole) {
  return CAPABILITIES[role] ?? [];
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as string[]).includes(value);
}

/** Capabilities that a given actor may hand over while creating/inviting staff. */
export function assignableRoles(actorRole: StaffRole): StaffRole[] {
  if (actorRole === "owner") return ["owner", "manager", "reception"];
  return [];
}

export function canManageTarget(actorRole: StaffRole, targetRole: StaffRole) {
  if (actorRole !== "owner") return false;
  return true;
}

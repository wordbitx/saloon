import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { StaffRole } from "@/lib/auth/roles";
import type { AuthBackend, SessionUser } from "@/lib/auth/session";

/**
 * Staff accounts (admin / manager / reception logins).
 *
 * Primary backend: the project Postgres database (`DATABASE_URL`, e.g. the
 * Supabase connection string). The table is created on first use, so attaching
 * Supabase is enough — no manual SQL run is required.
 *
 * Fallback backend: an in-process memory store seeded with the default owner.
 * That keeps the deployed demo usable when DATABASE_URL is missing, but staff
 * accounts created in memory do not survive a redeploy. The UI says so.
 */

export type StaffAccount = {
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

type StaffRecord = StaffAccount & { passwordHash: string };

export class AuthStoreError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function defaultAdminEmail() {
  return (process.env.ADMIN_EMAIL || "admin@glowsalon.pk").trim().toLowerCase();
}

export function defaultAdminPassword() {
  return process.env.ADMIN_PASSWORD || "GlowAdmin@2026";
}

const TABLE = "public.staff_accounts";

const createTableSql = `
create table if not exists ${TABLE} (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  role text not null default 'reception',
  password_hash text not null,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  constraint staff_accounts_role_check check (role in ('owner','manager','reception'))
);
create index if not exists staff_accounts_role_idx on ${TABLE} (role);
`;

/** Copy-paste SQL shown in the team panel when the database is unreachable. */
export const STAFF_TABLE_SQL = createTableSql.trim();

/**
 * These caches live on globalThis so every route bundle (RSC pages, API routes,
 * dev server reloads) sees the same pool and the same temporary staff map.
 */
type AuthGlobals = typeof globalThis & {
  __wbxStaffPool?: Pool;
  __wbxStaffBackend?: Promise<{ mode: AuthBackend; error?: string }>;
  __wbxStaffMemory?: Map<string, StaffRecord>;
};
const authGlobals = globalThis as AuthGlobals;
const memory = (authGlobals.__wbxStaffMemory ??= new Map<string, StaffRecord>());

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL || "";
}

function getPool() {
  if (authGlobals.__wbxStaffPool) return authGlobals.__wbxStaffPool;
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not configured");
  const created = new Pool({
    connectionString: url,
    max: 4,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 20000,
    ssl: /supabase\.(co|com)|sslmode=require|neon\.tech|render\.com/i.test(url)
      ? { rejectUnauthorized: false }
      : undefined,
  });
  authGlobals.__wbxStaffPool = created;
  return created;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function rowToAccount(row: Record<string, unknown>): StaffRecord {
  const asDate = (value: unknown) => (value instanceof Date ? value.toISOString() : String(value ?? new Date().toISOString()));
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: String(row.display_name),
    role: (row.role as StaffRole) ?? "reception",
    passwordHash: String(row.password_hash),
    isActive: Boolean(row.is_active),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
    lastLoginAt: row.last_login_at ? asDate(row.last_login_at) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
  };
}

function publicAccount(record: StaffRecord): StaffAccount {
  const { passwordHash: _passwordHash, ...rest } = record;
  return rest;
}

function seedMemory() {
  if (memory.size > 0) return;
  const now = new Date().toISOString();
  const email = defaultAdminEmail();
  memory.set(email, {
    id: randomUUID(),
    email,
    displayName: "Salon Owner",
    role: "owner",
    passwordHash: hashPassword(defaultAdminPassword()),
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    createdBy: "system",
  });
}

async function seedDatabase(client: Pool) {
  const email = defaultAdminEmail();
  // Only create the default owner when the salon has no active owner at all.
  const owners = await client.query(`select id from ${TABLE} where role = 'owner' and is_active = true limit 1`);
  if ((owners.rowCount ?? 0) > 0) return;
  await client.query(
    `insert into ${TABLE} (email, display_name, role, password_hash, is_active, created_by)
     values ($1, $2, 'owner', $3, true, 'system')
     on conflict (email) do update set password_hash = excluded.password_hash, role = 'owner', is_active = true`,
    [email, "Salon Owner", hashPassword(defaultAdminPassword())],
  );
}

async function initBackend(): Promise<{ mode: AuthBackend; error?: string }> {
  if (!databaseUrl()) {
    seedMemory();
    return { mode: "memory", error: "DATABASE_URL is not set — staff accounts live in this session only." };
  }
  try {
    const client = getPool();
    await client.query(createTableSql);
    await seedDatabase(client);
    return { mode: "database" };
  } catch (error) {
    console.warn("[auth] Falling back to in-memory staff store:", (error as Error).message);
    seedMemory();
    return { mode: "memory", error: `Database not reachable (${(error as Error).message}).` };
  }
}

function ensureBackend() {
  if (!authGlobals.__wbxStaffBackend) authGlobals.__wbxStaffBackend = initBackend();
  return authGlobals.__wbxStaffBackend;
}

export async function getAuthBackendInfo() {
  return ensureBackend();
}

async function query<T = Record<string, unknown>>(text: string, values: unknown[] = []) {
  const client = getPool();
  const result = await client.query(text, values);
  return result.rows as T[];
}

/* ------------------------------------------------------------------ */
/* Reads                                                              */
/* ------------------------------------------------------------------ */

export async function listStaffAccounts(): Promise<StaffAccount[]> {
  const backend = await ensureBackend();
  if (backend.mode === "memory") {
    return [...memory.values()]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(publicAccount);
  }
  const rows = await query(`select * from ${TABLE} order by created_at asc`);
  return rows.map((row) => publicAccount(rowToAccount(row)));
}

export async function getStaffAccountById(id: string): Promise<StaffAccount | null> {
  const backend = await ensureBackend();
  if (backend.mode === "memory") {
    const found = [...memory.values()].find((item) => item.id === id);
    return found ? publicAccount(found) : null;
  }
  const rows = await query(`select * from ${TABLE} where id = $1 limit 1`, [id]);
  return rows[0] ? publicAccount(rowToAccount(rows[0])) : null;
}

async function findRecordByEmail(email: string): Promise<StaffRecord | null> {
  const normalized = normalizeEmail(email);
  const backend = await ensureBackend();
  if (backend.mode === "memory") return memory.get(normalized) ?? null;
  const rows = await query(`select * from ${TABLE} where email = $1 limit 1`, [normalized]);
  return rows[0] ? rowToAccount(rows[0]) : null;
}

/** Verify credentials. Returns null for unknown emails, wrong passwords or disabled accounts. */
export async function authenticateStaff(email: string, password: string): Promise<StaffAccount | null> {
  const record = await findRecordByEmail(email);
  if (!record || !record.isActive) return null;
  if (!verifyPassword(password, record.passwordHash)) return null;

  const now = new Date().toISOString();
  const backend = await ensureBackend();
  if (backend.mode === "memory") {
    memory.set(record.email, { ...record, lastLoginAt: now, updatedAt: now });
  } else {
    await query(`update ${TABLE} set last_login_at = now(), updated_at = now() where id = $1`, [record.id]);
  }
  return publicAccount({ ...record, lastLoginAt: now });
}

/** Show the seeded default credentials on the login screen only until they are changed. */
export async function getDefaultCredentialHint(): Promise<{ email: string; password: string } | null> {
  try {
    const record = await findRecordByEmail(defaultAdminEmail());
    if (!record || !record.isActive) return null;
    if (!verifyPassword(defaultAdminPassword(), record.passwordHash)) return null;
    return { email: record.email, password: defaultAdminPassword() };
  } catch {
    return null;
  }
}

export async function sessionUserFor(account: StaffAccount): Promise<SessionUser> {
  const backend = await ensureBackend();
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    backend: backend.mode,
  };
}

/**
 * Re-read the signed-in account so deactivation / role changes apply immediately.
 *
 * In database mode a missing or disabled row means the session is dead. In the
 * temporary in-memory mode the HMAC-signed cookie is trusted when the row is not
 * in this instance, so a login is not lost between serverless instances.
 */
export async function getActiveSessionAccount(user: SessionUser): Promise<StaffAccount | null> {
  const account = await getStaffAccountById(user.id);
  if (account) return account.isActive ? account : null;

  const backend = await getAuthBackendInfo();
  if (backend.mode !== "memory") return null;

  const now = new Date().toISOString();
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    createdBy: null,
  };
}

/* ------------------------------------------------------------------ */
/* Writes                                                             */
/* ------------------------------------------------------------------ */

async function activeOwnerCount(): Promise<number> {
  const accounts = await listStaffAccounts();
  return accounts.filter((account) => account.role === "owner" && account.isActive).length;
}

export async function createStaffAccount(input: {
  email: string;
  displayName: string;
  password: string;
  role: StaffRole;
  actorEmail: string;
}): Promise<StaffAccount> {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthStoreError("Sahi email address likhein.");
  }
  if (!input.displayName.trim()) throw new AuthStoreError("Staff ka naam likhein.");
  if (await findRecordByEmail(email)) {
    throw new AuthStoreError("Ye email already registered hai — doosra email chunein.", 409);
  }
  const backend = await ensureBackend();
  const passwordHash = hashPassword(input.password);
  const now = new Date().toISOString();

  if (backend.mode === "memory") {
    const record: StaffRecord = {
      id: randomUUID(),
      email,
      displayName: input.displayName.trim(),
      role: input.role,
      passwordHash,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      createdBy: input.actorEmail,
    };
    memory.set(email, record);
    return publicAccount(record);
  }

  const rows = await query(
    `insert into ${TABLE} (email, display_name, role, password_hash, is_active, created_by)
     values ($1, $2, $3, $4, true, $5) returning *`,
    [email, input.displayName.trim(), input.role, passwordHash, input.actorEmail],
  );
  return publicAccount(rowToAccount(rows[0]));
}

export async function updateStaffAccount(
  id: string,
  patch: {
    email?: string;
    displayName?: string;
    role?: StaffRole;
    isActive?: boolean;
    password?: string;
  },
): Promise<StaffAccount> {
  const current = await getStaffAccountById(id);
  if (!current) throw new AuthStoreError("Staff account nahi mila.", 404);

  const nextEmail = patch.email !== undefined ? normalizeEmail(patch.email) : current.email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) throw new AuthStoreError("Sahi email address likhein.");
  if (nextEmail !== current.email) {
    const clash = await findRecordByEmail(nextEmail);
    if (clash && clash.id !== id) throw new AuthStoreError("Ye email already kisi aur staff ke paas hai.", 409);
  }

  const nextRole = patch.role ?? current.role;
  const nextActive = patch.isActive ?? current.isActive;

  // Never allow the salon to run without an active owner.
  const losingOwner = current.role === "owner" && current.isActive && (nextRole !== "owner" || !nextActive);
  if (losingOwner && (await activeOwnerCount()) <= 1) {
    throw new AuthStoreError("Aakhri active owner ko remove ya demote nahi kiya ja sakta.", 409);
  }

  const now = new Date().toISOString();
  const backend = await ensureBackend();

  if (backend.mode === "memory") {
    const record: StaffRecord = {
      ...(memory.get(current.email) as StaffRecord),
      email: nextEmail,
      displayName: patch.displayName?.trim() || current.displayName,
      role: nextRole,
      isActive: nextActive,
      updatedAt: now,
      passwordHash: patch.password ? hashPassword(patch.password) : (memory.get(current.email) as StaffRecord).passwordHash,
    };
    memory.delete(current.email);
    memory.set(nextEmail, record);
    return publicAccount(record);
  }

  const rows = await query(
    `update ${TABLE}
        set email = $2,
            display_name = coalesce($3, display_name),
            role = $4,
            is_active = $5,
            password_hash = coalesce($6, password_hash),
            updated_at = now()
      where id = $1
      returning *`,
    [
      id,
      nextEmail,
      patch.displayName?.trim() || null,
      nextRole,
      nextActive,
      patch.password ? hashPassword(patch.password) : null,
    ],
  );
  return publicAccount(rowToAccount(rows[0]));
}

export async function deleteStaffAccount(id: string): Promise<void> {
  const current = await getStaffAccountById(id);
  if (!current) throw new AuthStoreError("Staff account nahi mila.", 404);
  if (current.role === "owner" && current.isActive && (await activeOwnerCount()) <= 1) {
    throw new AuthStoreError("Aakhri owner account delete nahi ho sakta.", 409);
  }
  const backend = await ensureBackend();
  if (backend.mode === "memory") {
    memory.delete(current.email);
    return;
  }
  await query(`delete from ${TABLE} where id = $1`, [id]);
}

export async function changePassword(id: string, currentPassword: string, nextPassword: string): Promise<void> {
  const backend = await ensureBackend();
  let record: StaffRecord | null = null;
  if (backend.mode === "memory") {
    record = [...memory.values()].find((item) => item.id === id) ?? null;
  } else {
    const rows = await query(`select * from ${TABLE} where id = $1 limit 1`, [id]);
    record = rows[0] ? rowToAccount(rows[0]) : null;
  }
  if (!record) throw new AuthStoreError("Account nahi mila.", 404);
  if (!verifyPassword(currentPassword, record.passwordHash)) {
    throw new AuthStoreError("Purana password ghalat hai.", 401);
  }
  await updateStaffAccount(id, { password: nextPassword });
}

import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getAuthBackendInfo, getAuthStorePool, lockSessionUser, memorySessionUser } from "@/lib/auth/store";
import type { SessionUser } from "@/lib/auth/session";
import type { PublicProduct, SalonProduct } from "@/types/shop";
import { assertWorkspaceAction, scopeWorkspace } from "@/lib/workspaces/access";
import { appendPublicBookingRequest, appendPublicProductOrder, applyAction, applyProfile, createWorkspace, sampleWorkspace, withBookingReferences, WorkspaceError, type SalonWorkspace, type WorkspaceProfile } from "@/lib/workspaces/model";

const TABLE = "public.wbx_salon_workspaces";
type WorkspaceGlobals = typeof globalThis & {
  __wbxWorkspaceMemory?: Map<string, SalonWorkspace>;
  __wbxWorkspaceReady?: Promise<void>;
};
const globalStore = globalThis as WorkspaceGlobals;
const memory = (globalStore.__wbxWorkspaceMemory ??= new Map<string, SalonWorkspace>());

async function init() {
  const backend = await getAuthBackendInfo();
  if (backend.mode === "memory") {
    const sample = sampleWorkspace();
    if (memory.size === 0) memory.set(sample.id, sample);
    else {
      // Upgrade only the original fictional salon if it predates the shop.
      // An existing (even empty) catalog is an owner's choice and is untouched.
      const existing = memory.get(sample.id);
      if (existing?.isSample === true && existing.products === undefined) memory.set(sample.id, { ...existing, products: sample.products });
    }
    return;
  }
  const pool = getAuthStorePool();
  await pool.query(`
    create table if not exists ${TABLE} (
      id text primary key,
      document jsonb not null,
      updated_at timestamptz not null default now()
    );
    alter table ${TABLE} enable row level security;
    revoke all on table ${TABLE} from public;
  `);
  const sample = sampleWorkspace();
  await pool.query(`insert into ${TABLE} (id, document)
    select $1, $2::jsonb where not exists (select 1 from ${TABLE})
    on conflict (id) do nothing`, [sample.id, JSON.stringify(sample)]);
  // One-time upgrade for an older fictional sample workspace that never had a
  // catalog. Do not replace existing catalogs, deleted items, or real salons.
  await pool.query(`update ${TABLE}
    set document = jsonb_set(document, '{products}', $2::jsonb, true), updated_at = now()
    where id = $1 and document->'isSample' = 'true'::jsonb and not (document ? 'products')`,
    [sample.id, JSON.stringify(sample.products)]);
}

async function ready() {
  if (!globalStore.__wbxWorkspaceReady) globalStore.__wbxWorkspaceReady = init().catch((error) => {
    globalStore.__wbxWorkspaceReady = undefined;
    throw error;
  });
  await globalStore.__wbxWorkspaceReady;
  return (await getAuthBackendInfo()).mode;
}

function copy(workspace: SalonWorkspace) { return structuredClone(workspace); }

async function upgradeReferencesOnRead(workspace: SalonWorkspace): Promise<SalonWorkspace> {
  // Do not allocate from a stale read. Recheck against the latest document
  // under the same row lock used by booking creation and all other actions.
  if (withBookingReferences(workspace) === workspace) return copy(workspace);
  return mutate(workspace.id, withBookingReferences);
}

export async function getWorkspace(id: string): Promise<SalonWorkspace | null> {
  if (await ready() === "memory") {
    const workspace = memory.get(id);
    return workspace ? upgradeReferencesOnRead(copy(workspace)) : null;
  }
  const result = await getAuthStorePool().query(`select document from ${TABLE} where id = $1`, [id]);
  return result.rows[0] ? upgradeReferencesOnRead(result.rows[0].document as SalonWorkspace) : null;
}

/** Owners see the installation; staff receive only their explicitly assigned branch. */
export async function workspacesFor(user: SessionUser): Promise<SalonWorkspace[]> {
  if (user.role !== "owner") {
    if (!user.salonId || !user.branchId) return [];
    const workspace = await getWorkspace(user.salonId);
    const scoped = workspace ? scopeWorkspace(workspace, user) : null;
    return scoped ? [scoped] : [];
  }
  if (await ready() === "memory") return Promise.all([...memory.values()].map((workspace) => upgradeReferencesOnRead(copy(workspace))));
  const result = await getAuthStorePool().query(`select document from ${TABLE} order by updated_at asc, id asc`);
  return Promise.all(result.rows.map((row) => upgradeReferencesOnRead(row.document as SalonWorkspace)));
}

export function canAccessWorkspace(user: SessionUser, id: string) {
  return user.role === "owner" || (!!user.salonId && !!user.branchId && user.salonId === id);
}

export async function addWorkspace(profile: WorkspaceProfile): Promise<SalonWorkspace> {
  const workspace = createWorkspace(profile);
  if (await ready() === "memory") {
    if (memory.has(profile.id)) throw new WorkspaceError("Ye salon already maujood hai.", 409);
    memory.set(profile.id, copy(workspace));
    return workspace;
  }
  try {
    await getAuthStorePool().query(`insert into ${TABLE} (id, document) values ($1, $2::jsonb)`, [workspace.id, JSON.stringify(workspace)]);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new WorkspaceError("Ye salon already maujood hai.", 409);
    throw error;
  }
  return workspace;
}

async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getAuthStorePool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function mutate(id: string, update: (workspace: SalonWorkspace, actor: SessionUser | null) => SalonWorkspace, actorId?: string): Promise<SalonWorkspace> {
  if (await ready() === "memory") {
    const current = memory.get(id);
    if (!current) throw new WorkspaceError("Salon nahi mila.", 404);
    // update is synchronous; no other request can interleave this read/write in one process.
    const next = update(withBookingReferences(copy(current)), actorId ? memorySessionUser(actorId) : null);
    memory.set(id, copy(next));
    return next;
  }
  return transaction(async (client) => {
    const rows = await client.query(`select document from ${TABLE} where id = $1 for update`, [id]);
    if (!rows.rows[0]) throw new WorkspaceError("Salon nahi mila.", 404);
    const actor = actorId ? await lockSessionUser(client, actorId) : null;
    const next = update(withBookingReferences(rows.rows[0].document as SalonWorkspace), actor);
    await client.query(`update ${TABLE} set document = $2::jsonb, updated_at = now() where id = $1`, [id, JSON.stringify(next)]);
    return next;
  });
}

export async function updateWorkspaceProfile(id: string, profile: WorkspaceProfile) {
  if (id !== profile.id) throw new WorkspaceError("Salon ID match nahi karta.");
  return mutate(id, (workspace) => applyProfile(workspace, profile));
}

export async function applyWorkspaceAction(id: string, action: unknown, user: SessionUser) {
  let actor: SessionUser | null = null;
  const saved = await mutate(id, (workspace, currentActor) => {
    assertWorkspaceAction(workspace, currentActor, action);
    actor = currentActor;
    return applyAction(workspace, action);
  }, user.id);
  const scoped = actor ? scopeWorkspace(saved, actor) : null;
  if (!scoped) throw new WorkspaceError("Is branch ki permission nahi hai.", 403);
  return scoped;
}

/** Public projection contains only the salon's explicitly published booking menu. */
export async function publicBookingInfo(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return null;
  const workspace = await getWorkspace(id);
  if (!workspace || workspace.publicBookingEnabled !== true) return null;
  return {
    id: workspace.id, name: workspace.settings.name, city: workspace.settings.city,
    branches: workspace.settings.branches.map(({ id: branchId, name, area }) => ({ id: branchId, name, area })),
    services: workspace.settings.services.map(({ id: serviceId, name, durationMinutes, pricePKR }) => ({ id: serviceId, name, durationMinutes, pricePKR })),
  };
}

export async function submitPublicBookingRequest(id: string, input: unknown) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new WorkspaceError("Booking link available nahi hai.", 404);
  // The flag, branch, service and request are checked against the latest
  // document inside the same lock as profile edits and booking confirmations.
  await mutate(id, (workspace) => appendPublicBookingRequest(workspace, input, `WR-${randomUUID()}`, new Date().toISOString()));
}

/** Only explicitly published product fields leave the server. Orders, salon
 * contact details, booking history and unpublished drafts never appear here. */
function publicProduct(workspace: Pick<SalonWorkspace, "id" | "settings" | "isSample">, product: SalonProduct): PublicProduct {
  const photo = product.imageDataUrl;
  const imageUrl = photo ? (photo.startsWith("/images/") ? photo : `/api/public/products/${encodeURIComponent(workspace.id)}/${encodeURIComponent(product.id)}/image?v=${product.version}`) : undefined;
  return { id: product.id, salonId: workspace.id, salonName: workspace.settings.name, city: workspace.settings.city, isSample: workspace.isSample === true, name: product.name, category: product.category, description: product.description, pricePKR: product.pricePKR, version: product.version, ...(imageUrl ? { imageUrl } : {}) };
}

export async function listPublicProducts(): Promise<PublicProduct[]> {
  let sources: Pick<SalonWorkspace, "id" | "settings" | "isSample" | "products">[];
  if (await ready() === "memory") {
    sources = [...memory.values()];
  } else {
    // Select only catalog and public salon identity fields, not order or booking documents.
    const result = await getAuthStorePool().query(`select id, document->'settings'->>'name' as name, document->'settings'->>'city' as city, document->'isSample' as sample, document->'products' as products from ${TABLE} where document ? 'products'`);
    sources = result.rows.map((row) => ({ id: row.id, settings: { name: row.name, city: row.city } as SalonWorkspace["settings"], isSample: row.sample === true, products: row.products }));
  }
  return sources.flatMap((workspace) => (Array.isArray(workspace.products) ? workspace.products : []).filter((product) => product.published === true).map((product) => ({ product, workspace })))
    .sort((a, b) => (b.product.updatedAt ?? "").localeCompare(a.product.updatedAt ?? ""))
    .map(({ workspace, product }) => publicProduct(workspace, product));
}

export async function getPublicProduct(salonId: string, productId: string): Promise<PublicProduct | null> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(salonId) || !/^[a-zA-Z0-9_-]{1,100}$/.test(productId)) return null;
  const workspace = await getWorkspace(salonId);
  const product = workspace?.products?.find((item) => item.id === productId && item.published === true);
  return workspace && product ? publicProduct(workspace, product) : null;
}

export async function publicProductImage(salonId: string, productId: string): Promise<string | null> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(salonId) || !/^[a-zA-Z0-9_-]{1,100}$/.test(productId)) return null;
  const workspace = await getWorkspace(salonId);
  return workspace?.products?.find((product) => product.id === productId && product.published)?.imageDataUrl ?? null;
}

export async function submitPublicProductOrder(salonId: string, input: unknown): Promise<{ reference: string }> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(salonId)) throw new WorkspaceError("Shop available nahi hai.", 404);
  let reference = "";
  await mutate(salonId, (workspace) => {
    const result = appendPublicProductOrder(workspace, input, `order-${randomUUID()}`, new Date().toISOString());
    reference = result.reference;
    return result.workspace;
  });
  return { reference };
}

export async function deleteWorkspace(id: string): Promise<void> {
  if (await ready() === "memory") {
    if (!memory.has(id)) throw new WorkspaceError("Salon nahi mila.", 404);
    if (memory.size <= 1) throw new WorkspaceError("Kam az kam ek salon zaroori hai. Pehle doosra salon add karein.", 409);
    memory.delete(id);
    return;
  }
  await transaction(async (client) => {
    // Serialize deletions so two owners cannot delete the final two salons simultaneously.
    await client.query(`lock table ${TABLE} in exclusive mode`);
    const exists = await client.query(`select id from ${TABLE} where id = $1`, [id]);
    if (!exists.rowCount) throw new WorkspaceError("Salon nahi mila.", 404);
    const count = await client.query(`select count(*)::int as count from ${TABLE}`);
    if (count.rows[0].count <= 1) throw new WorkspaceError("Kam az kam ek salon zaroori hai. Pehle doosra salon add karein.", 409);
    await client.query(`delete from ${TABLE} where id = $1`, [id]);
  });
}

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Tenant-safe operational schema. On Supabase, RLS policies in
 * supabase/migrations/0001_tenant_rls.sql restrict each table to the signed-in
 * user's salon membership.
 */
export const salons = pgTable("salons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  city: varchar("city", { length: 100 }).notNull().default("Lahore"),
  timezone: varchar("timezone", { length: 80 }).notNull().default("Asia/Karachi"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salonUsers = pgTable(
  "salon_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // References auth.users(id) through the Supabase migration, intentionally
    // not as a Drizzle relation so the schema also works with local Postgres.
    userId: uuid("user_id").notNull(),
    salonId: uuid("salon_id").notNull().references(() => salons.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 30 }).notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("salon_users_salon_id_idx").on(table.salonId), index("salon_users_user_id_idx").on(table.userId)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    salonId: uuid("salon_id").notNull().references(() => salons.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    phoneE164: varchar("phone_e164", { length: 24 }).notNull(),
    lastService: varchar("last_service", { length: 160 }),
    lastVisitAt: timestamp("last_visit_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("customers_salon_id_idx").on(table.salonId), index("customers_salon_phone_idx").on(table.salonId, table.phoneE164)],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    salonId: uuid("salon_id").notNull().references(() => salons.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    pricePkr: integer("price_pkr").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("services_salon_id_idx").on(table.salonId)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    salonId: uuid("salon_id").notNull().references(() => salons.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    source: varchar("source", { length: 40 }).notNull().default("whatsapp"),
    staffName: varchar("staff_name", { length: 160 }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("confirmed"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("bookings_salon_id_idx").on(table.salonId), index("bookings_salon_start_idx").on(table.salonId, table.startsAt)],
);

export const missedMessages = pgTable(
  "missed_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    salonId: uuid("salon_id").notNull().references(() => salons.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    channel: varchar("channel", { length: 32 }).notNull(),
    direction: varchar("direction", { length: 20 }).notNull().default("inbound"),
    body: text("body"),
    status: varchar("status", { length: 40 }).notNull().default("pending"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [index("missed_messages_salon_id_idx").on(table.salonId)],
);

export const reviewRequests = pgTable(
  "review_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    salonId: uuid("salon_id").notNull().references(() => salons.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    status: varchar("status", { length: 40 }).notNull().default("queued"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("review_requests_salon_id_idx").on(table.salonId)],
);

export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    salonId: uuid("salon_id").notNull().references(() => salons.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    preferredDate: varchar("preferred_date", { length: 40 }),
    status: varchar("status", { length: 40 }).notNull().default("waiting"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("waitlist_entries_salon_id_idx").on(table.salonId)],
);

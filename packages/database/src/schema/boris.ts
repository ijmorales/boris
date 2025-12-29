import { relations } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkId: text('clerk_id').notNull().unique(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    isAdmin: boolean('is_admin').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('users_clerk_id_idx').on(table.clerkId),
    index('users_organization_id_idx').on(table.organizationId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ============================================================================
// INVITES
// ============================================================================

export const invites = pgTable(
  'invites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    isAdmin: boolean('is_admin').notNull().default(false),
    invitedById: uuid('invited_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('invites_email_org').on(table.email, table.organizationId),
    index('invites_email_idx').on(table.email),
    index('invites_organization_idx').on(table.organizationId),
  ],
);

export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;

// ============================================================================
// ENUMS
// ============================================================================

export const platformEnum = pgEnum('platform', [
  'META',
  'GOOGLE_ADS',
  'TIKTOK',
]);
export const adObjectTypeEnum = pgEnum('ad_object_type', [
  'CAMPAIGN',
  'AD_SET',
  'AD',
]);

// ============================================================================
// CLIENTS
// ============================================================================

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('clients_name_idx').on(table.name),
    index('clients_organization_idx').on(table.organizationId),
  ],
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

// ============================================================================
// PLATFORM CONNECTIONS
// ============================================================================

export const platformConnections = pgTable(
  'platform_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    platform: platformEnum('platform').notNull(),
    credentials: jsonb('credentials').notNull(), // OAuth tokens - encrypt at app layer
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('platform_connections_org_idx').on(table.organizationId)],
);

export type PlatformConnection = typeof platformConnections.$inferSelect;
export type NewPlatformConnection = typeof platformConnections.$inferInsert;

// ============================================================================
// AD ACCOUNTS
// ============================================================================

export const adAccounts = pgTable(
  'ad_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    platformConnectionId: uuid('platform_connection_id')
      .notNull()
      .references(() => platformConnections.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'set null',
    }),
    externalId: text('external_id').notNull(),
    name: text('name'),
    currency: text('currency').notNull(),
    timezone: text('timezone').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('ad_accounts_connection_external').on(
      table.platformConnectionId,
      table.externalId,
    ),
    index('ad_accounts_platform_connection_idx').on(table.platformConnectionId),
    index('ad_accounts_client_idx').on(table.clientId),
  ],
);

export type AdAccount = typeof adAccounts.$inferSelect;
export type NewAdAccount = typeof adAccounts.$inferInsert;

// ============================================================================
// AD OBJECTS (Campaign > Ad Set > Ad hierarchy)
// ============================================================================

export const adObjects = pgTable(
  'ad_objects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adAccountId: uuid('ad_account_id')
      .notNull()
      .references(() => adAccounts.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    type: adObjectTypeEnum('type').notNull(),
    name: text('name'),
    status: text('status').notNull(), // ACTIVE, PAUSED, ARCHIVED, DELETED
    parentId: uuid('parent_id').references((): AnyPgColumn => adObjects.id, {
      onDelete: 'cascade',
    }),
    platformData: jsonb('platform_data'), // Raw API response data
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('ad_objects_account_external').on(
      table.adAccountId,
      table.externalId,
    ),
    index('ad_objects_ad_account_idx').on(table.adAccountId),
    index('ad_objects_parent_idx').on(table.parentId),
  ],
);

export type AdObject = typeof adObjects.$inferSelect;
export type NewAdObject = typeof adObjects.$inferInsert;

// ============================================================================
// SPENDINGS (TimescaleDB hypertable - created via custom migration)
// ============================================================================

export const spendings = pgTable(
  'spendings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adObjectId: uuid('ad_object_id')
      .notNull()
      .references(() => adObjects.id, { onDelete: 'cascade' }),
    collectedAt: timestamp('collected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull(),
    impressions: bigint('impressions', { mode: 'bigint' }),
    clicks: bigint('clicks', { mode: 'bigint' }),
    conversions: bigint('conversions', { mode: 'bigint' }),
    metrics: jsonb('metrics'), // Platform-specific metrics (CTR, CPC, etc.)
  },
  (table) => [
    // FK index for joins with ad_objects
    index('spendings_ad_object_idx').on(table.adObjectId),
    // Note: TimescaleDB creates automatic index on collected_at (partition column)
    // period_start index omitted - add if queries become slow
  ],
);

export type Spending = typeof spendings.$inferSelect;
export type NewSpending = typeof spendings.$inferInsert;

// ============================================================================
// RELATIONS (for Drizzle relational queries)
// ============================================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  invites: many(invites),
  platformConnections: many(platformConnections),
  clients: many(clients),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  invitesSent: many(invites),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  organization: one(organizations, {
    fields: [invites.organizationId],
    references: [organizations.id],
  }),
  invitedBy: one(users, {
    fields: [invites.invitedById],
    references: [users.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
  adAccounts: many(adAccounts),
}));

export const platformConnectionsRelations = relations(
  platformConnections,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [platformConnections.organizationId],
      references: [organizations.id],
    }),
    adAccounts: many(adAccounts),
  }),
);

export const adAccountsRelations = relations(adAccounts, ({ one, many }) => ({
  client: one(clients, {
    fields: [adAccounts.clientId],
    references: [clients.id],
  }),
  platformConnection: one(platformConnections, {
    fields: [adAccounts.platformConnectionId],
    references: [platformConnections.id],
  }),
  adObjects: many(adObjects),
}));

export const adObjectsRelations = relations(adObjects, ({ one, many }) => ({
  adAccount: one(adAccounts, {
    fields: [adObjects.adAccountId],
    references: [adAccounts.id],
  }),
  parent: one(adObjects, {
    fields: [adObjects.parentId],
    references: [adObjects.id],
    relationName: 'hierarchy',
  }),
  children: many(adObjects, { relationName: 'hierarchy' }),
  spendings: many(spendings),
}));

export const spendingsRelations = relations(spendings, ({ one }) => ({
  adObject: one(adObjects, {
    fields: [spendings.adObjectId],
    references: [adObjects.id],
  }),
}));

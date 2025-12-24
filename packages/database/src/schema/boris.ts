import { relations } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
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
// PLATFORM CONNECTIONS
// ============================================================================

export const platformConnections = pgTable('platform_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  platform: platformEnum('platform').notNull(),
  credentials: jsonb('credentials').notNull(), // OAuth tokens - encrypt at app layer
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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
    index('spendings_ad_object_idx').on(table.adObjectId),
    index('spendings_collected_at_idx').on(table.collectedAt),
  ],
);

export type Spending = typeof spendings.$inferSelect;
export type NewSpending = typeof spendings.$inferInsert;

// ============================================================================
// RELATIONS (for Drizzle relational queries)
// ============================================================================

export const platformConnectionsRelations = relations(
  platformConnections,
  ({ many }) => ({
    adAccounts: many(adAccounts),
  }),
);

export const adAccountsRelations = relations(adAccounts, ({ one, many }) => ({
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

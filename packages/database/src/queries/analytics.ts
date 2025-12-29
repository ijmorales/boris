import { and, count, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { db } from '../client.js';
import {
  adAccounts,
  adObjects,
  platformConnections,
  spendings,
} from '../schema/boris.js';

// Pagination types
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Response types
export interface AccountWithSpending {
  id: string;
  name: string | null;
  platform: 'META' | 'GOOGLE_ADS' | 'TIKTOK';
  currency: string;
  timezone: string;
  clientId: string | null;
  totalSpendCents: number;
  totalImpressions: number;
  totalClicks: number;
}

export interface ObjectWithSpending {
  id: string;
  externalId: string;
  type: 'CAMPAIGN' | 'AD_SET' | 'AD';
  name: string | null;
  status: string;
  parentId: string | null;
  parentName: string | null;
  parentType: 'CAMPAIGN' | 'AD_SET' | 'AD' | null;
  spendCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface AccountInfo {
  id: string;
  name: string | null;
  platform: 'META' | 'GOOGLE_ADS' | 'TIKTOK';
}

// Subquery to get only the latest spending record per (ad_object_id, period_start)
// This handles the append-only design where each sync creates new records
// and we want to use only the most recent attribution data
function latestSpendingsSubquery(startDate: Date, endDate: Date) {
  // Add one day to endDate to make it inclusive (frontend sends the last day to include)
  const inclusiveEndDate = new Date(endDate);
  inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);

  return db
    .selectDistinctOn([spendings.adObjectId, spendings.periodStart], {
      adObjectId: spendings.adObjectId,
      periodStart: spendings.periodStart,
      amountCents: spendings.amountCents,
      impressions: spendings.impressions,
      clicks: spendings.clicks,
      conversions: spendings.conversions,
    })
    .from(spendings)
    .where(
      and(
        gte(spendings.periodStart, startDate),
        lt(spendings.periodStart, inclusiveEndDate),
      ),
    )
    .orderBy(
      spendings.adObjectId,
      spendings.periodStart,
      desc(spendings.collectedAt),
    )
    .as('latest_spendings');
}

// Ad accounts with aggregated spending
// Only counts spending from AD-level objects (leaf nodes) to avoid double-counting
// since spending can be recorded at campaign, ad set, and ad levels
// Uses only the latest spending record per period (for attribution changes)
export async function getAccountsWithSpending(
  startDate: Date,
  endDate: Date,
  organizationId: string,
): Promise<AccountWithSpending[]> {
  const latestSpendings = latestSpendingsSubquery(startDate, endDate);

  const results = await db
    .select({
      id: adAccounts.id,
      name: adAccounts.name,
      platform: platformConnections.platform,
      currency: adAccounts.currency,
      timezone: adAccounts.timezone,
      clientId: adAccounts.clientId,
      totalSpendCents: sql<number>`COALESCE(SUM(${latestSpendings.amountCents}), 0)::bigint`,
      totalImpressions: sql<number>`COALESCE(SUM(${latestSpendings.impressions}), 0)::bigint`,
      totalClicks: sql<number>`COALESCE(SUM(${latestSpendings.clicks}), 0)::bigint`,
    })
    .from(adAccounts)
    .innerJoin(
      platformConnections,
      eq(adAccounts.platformConnectionId, platformConnections.id),
    )
    .leftJoin(
      adObjects,
      and(eq(adObjects.adAccountId, adAccounts.id), eq(adObjects.type, 'AD')),
    )
    .leftJoin(latestSpendings, eq(latestSpendings.adObjectId, adObjects.id))
    .where(eq(platformConnections.organizationId, organizationId))
    .groupBy(
      adAccounts.id,
      adAccounts.name,
      platformConnections.platform,
      adAccounts.currency,
      adAccounts.timezone,
      adAccounts.clientId,
    );

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    platform: row.platform,
    currency: row.currency,
    timezone: row.timezone,
    clientId: row.clientId,
    totalSpendCents: Number(row.totalSpendCents),
    totalImpressions: Number(row.totalImpressions),
    totalClicks: Number(row.totalClicks),
  }));
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// Objects with spending for a specific level (includes parent info for breadcrumbs)
// Uses only the latest spending record per period (for attribution changes)
export async function getObjectsWithSpending(
  accountId: string,
  parentId: string | null,
  startDate: Date,
  endDate: Date,
  pagination?: PaginationParams,
): Promise<PaginatedResult<ObjectWithSpending>> {
  const limit = Math.min(pagination?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = pagination?.offset ?? 0;

  const latestSpendings = latestSpendingsSubquery(startDate, endDate);

  // Create an alias for the parent table
  const parentAlias = db
    .select({
      id: adObjects.id,
      name: adObjects.name,
      type: adObjects.type,
    })
    .from(adObjects)
    .as('parent_obj');

  // Get total count
  const whereCondition = and(
    eq(adObjects.adAccountId, accountId),
    parentId === null
      ? isNull(adObjects.parentId)
      : eq(adObjects.parentId, parentId),
  );

  const countResult = await db
    .select({ count: count() })
    .from(adObjects)
    .where(whereCondition);
  const total = Number(countResult[0]?.count ?? 0);

  const results = await db
    .select({
      id: adObjects.id,
      externalId: adObjects.externalId,
      type: adObjects.type,
      name: adObjects.name,
      status: adObjects.status,
      parentId: adObjects.parentId,
      parentName: parentAlias.name,
      parentType: parentAlias.type,
      spendCents: sql<number>`COALESCE(SUM(${latestSpendings.amountCents}), 0)::bigint`,
      impressions: sql<number>`COALESCE(SUM(${latestSpendings.impressions}), 0)::bigint`,
      clicks: sql<number>`COALESCE(SUM(${latestSpendings.clicks}), 0)::bigint`,
      conversions: sql<number>`COALESCE(SUM(${latestSpendings.conversions}), 0)::bigint`,
    })
    .from(adObjects)
    .leftJoin(parentAlias, eq(adObjects.parentId, parentAlias.id))
    .leftJoin(latestSpendings, eq(latestSpendings.adObjectId, adObjects.id))
    .where(whereCondition)
    .groupBy(
      adObjects.id,
      adObjects.externalId,
      adObjects.type,
      adObjects.name,
      adObjects.status,
      adObjects.parentId,
      parentAlias.id,
      parentAlias.name,
      parentAlias.type,
    )
    .orderBy(desc(sql`SUM(${latestSpendings.amountCents})`))
    .limit(limit)
    .offset(offset);

  // Calculate derived metrics server-side
  const data = results.map((row) => {
    const spendCents = Number(row.spendCents);
    const impressions = Number(row.impressions);
    const clicks = Number(row.clicks);

    return {
      id: row.id,
      externalId: row.externalId,
      type: row.type,
      name: row.name,
      status: row.status,
      parentId: row.parentId,
      parentName: row.parentName,
      parentType: row.parentType,
      spendCents,
      impressions,
      clicks,
      conversions: Number(row.conversions),
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spendCents / clicks / 100 : 0,
      cpm: impressions > 0 ? ((spendCents / impressions) * 1000) / 100 : 0,
    };
  });

  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    },
  };
}

// Get account info (for breadcrumb root and validation)
// Returns null if account doesn't exist or doesn't belong to the organization
export async function getAccountById(
  accountId: string,
  organizationId: string,
): Promise<AccountInfo | null> {
  const result = await db
    .select({
      id: adAccounts.id,
      name: adAccounts.name,
      platform: platformConnections.platform,
    })
    .from(adAccounts)
    .innerJoin(
      platformConnections,
      eq(adAccounts.platformConnectionId, platformConnections.id),
    )
    .where(
      and(
        eq(adAccounts.id, accountId),
        eq(platformConnections.organizationId, organizationId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

import {
  adAccounts,
  adObjects,
  db,
  eq,
  type NewAdObject,
  type NewSpending,
  platformConnections,
  spendings,
  sql,
} from '@boris/database';
import { env } from '../lib/env.js';

// ============================================================================
// Types (inline - no separate file needed)
// ============================================================================

interface MetaAdAccount {
  id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
}

interface MetaInsight {
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  reach?: string;
  frequency?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  actions?: unknown;
}

interface MetaPaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: { after?: string };
    next?: string;
  };
}

// ============================================================================
// MetaSyncer Class
// ============================================================================

export class MetaSyncer {
  private readonly accessToken: string;
  private readonly apiVersion = 'v21.0';
  private readonly baseUrl = 'https://graph.facebook.com';
  private readonly requestTimeoutMs = 30000;

  constructor() {
    this.accessToken = env.META_ADS_TOKEN;
  }

  // --------------------------------------------------------------------------
  // Main Sync Method
  // --------------------------------------------------------------------------

  async sync(startDate: Date, endDate: Date): Promise<void> {
    // Step 1: Ensure platform connection exists (for foreign key)
    const connectionId = await this.ensurePlatformConnection();

    // Step 2: Discover and upsert all ad accounts
    const metaAccounts = await this.fetchAdAccounts();

    for (const metaAccount of metaAccounts) {
      // Upsert ad account
      const dbAccount = await this.upsertAdAccount(connectionId, metaAccount);

      // Fetch insights for all levels
      const insights = await this.fetchAllInsights(
        metaAccount.id.replace('act_', ''),
        startDate,
        endDate,
      );

      // Batch upsert ad objects
      const adObjectMap = await this.batchUpsertAdObjects(
        dbAccount.id,
        insights,
      );

      // Batch upsert spendings
      await this.batchUpsertSpendings(
        adObjectMap,
        insights,
        metaAccount.currency,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Platform Connection
  // --------------------------------------------------------------------------

  private async ensurePlatformConnection(): Promise<string> {
    // Check if META connection exists
    const [existing] = await db
      .select()
      .from(platformConnections)
      .where(eq(platformConnections.platform, 'META'))
      .limit(1);

    if (existing) {
      return existing.id;
    }

    // Create new connection
    const [created] = await db
      .insert(platformConnections)
      .values({
        platform: 'META',
        credentials: { accessToken: '[STORED_IN_ENV]' }, // Don't store actual token
      })
      .returning();

    return created.id;
  }

  // --------------------------------------------------------------------------
  // Meta API Fetching
  // --------------------------------------------------------------------------

  private async fetchFromMeta<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}/${this.apiVersion}${endpoint}`;
    const separator = endpoint.includes('?') ? '&' : '?';

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.requestTimeoutMs,
    );

    try {
      const response = await fetch(
        `${url}${separator}access_token=${this.accessToken}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Meta API error (${response.status}): ${errorBody}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Meta API timeout after ${this.requestTimeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async fetchAllPages<T>(endpoint: string): Promise<T[]> {
    const results: T[] = [];
    let currentEndpoint: string | null = endpoint;

    while (currentEndpoint) {
      const response: MetaPaginatedResponse<T> =
        await this.fetchFromMeta<MetaPaginatedResponse<T>>(currentEndpoint);
      results.push(...response.data);

      // Get next page URL if exists
      if (response.paging?.next) {
        // Extract path from full URL
        currentEndpoint = response.paging.next.replace(
          `${this.baseUrl}/${this.apiVersion}`,
          '',
        );
      } else {
        currentEndpoint = null;
      }
    }

    return results;
  }

  private async fetchAdAccounts(): Promise<MetaAdAccount[]> {
    return this.fetchAllPages<MetaAdAccount>(
      '/me/adaccounts?fields=id,name,currency,timezone_name,account_status&limit=100',
    );
  }

  private async fetchAllInsights(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MetaInsight[]> {
    const timeRange = JSON.stringify({
      since: startDate.toISOString().split('T')[0],
      until: endDate.toISOString().split('T')[0],
    });

    const fields = [
      'spend',
      'impressions',
      'clicks',
      'reach',
      'frequency',
      'cpm',
      'cpc',
      'ctr',
      'actions',
    ].join(',');

    const allInsights: MetaInsight[] = [];

    // Fetch at campaign level
    const campaignInsights = await this.fetchAllPages<MetaInsight>(
      `/act_${accountId}/insights?level=campaign&time_range=${encodeURIComponent(timeRange)}&fields=${fields},campaign_id,campaign_name&time_increment=1&limit=100`,
    );
    allInsights.push(...campaignInsights);

    // Fetch at adset level
    const adsetInsights = await this.fetchAllPages<MetaInsight>(
      `/act_${accountId}/insights?level=adset&time_range=${encodeURIComponent(timeRange)}&fields=${fields},adset_id,adset_name,campaign_id&time_increment=1&limit=100`,
    );
    allInsights.push(...adsetInsights);

    // Fetch at ad level
    const adInsights = await this.fetchAllPages<MetaInsight>(
      `/act_${accountId}/insights?level=ad&time_range=${encodeURIComponent(timeRange)}&fields=${fields},ad_id,ad_name,adset_id&time_increment=1&limit=100`,
    );
    allInsights.push(...adInsights);

    return allInsights;
  }

  // --------------------------------------------------------------------------
  // Database Upserts (Batched)
  // --------------------------------------------------------------------------

  private async upsertAdAccount(
    connectionId: string,
    metaAccount: MetaAdAccount,
  ): Promise<{ id: string }> {
    const externalId = metaAccount.id.replace('act_', '');

    const [result] = await db
      .insert(adAccounts)
      .values({
        platformConnectionId: connectionId,
        externalId,
        name: metaAccount.name,
        currency: metaAccount.currency,
        timezone: metaAccount.timezone_name,
      })
      .onConflictDoUpdate({
        target: [adAccounts.platformConnectionId, adAccounts.externalId],
        set: {
          name: sql`EXCLUDED.name`,
          currency: sql`EXCLUDED.currency`,
          timezone: sql`EXCLUDED.timezone`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: adAccounts.id });

    return result;
  }

  private async batchUpsertAdObjects(
    adAccountId: string,
    insights: MetaInsight[],
  ): Promise<Map<string, string>> {
    // Build unique ad objects from insights
    const adObjectsToUpsert: Array<{
      externalId: string;
      type: 'CAMPAIGN' | 'AD_SET' | 'AD';
      name: string;
      parentExternalId: string | null;
    }> = [];

    const seen = new Set<string>();

    for (const insight of insights) {
      // Campaign
      if (insight.campaign_id && !seen.has(insight.campaign_id)) {
        seen.add(insight.campaign_id);
        adObjectsToUpsert.push({
          externalId: insight.campaign_id,
          type: 'CAMPAIGN',
          name: insight.campaign_name || 'Unknown Campaign',
          parentExternalId: null,
        });
      }

      // AdSet
      if (insight.adset_id && !seen.has(insight.adset_id)) {
        seen.add(insight.adset_id);
        adObjectsToUpsert.push({
          externalId: insight.adset_id,
          type: 'AD_SET',
          name: insight.adset_name || 'Unknown AdSet',
          parentExternalId: insight.campaign_id || null,
        });
      }

      // Ad
      if (insight.ad_id && !seen.has(insight.ad_id)) {
        seen.add(insight.ad_id);
        adObjectsToUpsert.push({
          externalId: insight.ad_id,
          type: 'AD',
          name: insight.ad_name || 'Unknown Ad',
          parentExternalId: insight.adset_id || null,
        });
      }
    }

    if (adObjectsToUpsert.length === 0) {
      return new Map();
    }

    // Insert all ad objects (without parent resolution first)
    const values: NewAdObject[] = adObjectsToUpsert.map((obj) => ({
      adAccountId,
      externalId: obj.externalId,
      type: obj.type,
      name: obj.name,
      status: 'ACTIVE',
      parentId: null, // Resolve after insert
      platformData: {},
    }));

    await db
      .insert(adObjects)
      .values(values)
      .onConflictDoUpdate({
        target: [adObjects.adAccountId, adObjects.externalId],
        set: {
          name: sql`EXCLUDED.name`,
          status: sql`EXCLUDED.status`,
          updatedAt: new Date(),
        },
      });

    // Query back all ad objects to build externalId -> UUID map
    const dbAdObjects = await db
      .select({ id: adObjects.id, externalId: adObjects.externalId })
      .from(adObjects)
      .where(eq(adObjects.adAccountId, adAccountId));

    const externalIdToUuid = new Map<string, string>();
    for (const obj of dbAdObjects) {
      externalIdToUuid.set(obj.externalId, obj.id);
    }

    // Update parent references
    for (const obj of adObjectsToUpsert) {
      if (obj.parentExternalId) {
        const childId = externalIdToUuid.get(obj.externalId);
        const parentId = externalIdToUuid.get(obj.parentExternalId);

        if (childId && parentId) {
          await db
            .update(adObjects)
            .set({ parentId })
            .where(eq(adObjects.id, childId));
        }
      }
    }

    return externalIdToUuid;
  }

  private async batchUpsertSpendings(
    adObjectMap: Map<string, string>,
    insights: MetaInsight[],
    currency: string,
  ): Promise<void> {
    const spendingsToUpsert: NewSpending[] = [];

    for (const insight of insights) {
      // Determine which ad object this insight belongs to
      let adObjectExternalId: string | undefined;
      if (insight.ad_id) {
        adObjectExternalId = insight.ad_id;
      } else if (insight.adset_id) {
        adObjectExternalId = insight.adset_id;
      } else if (insight.campaign_id) {
        adObjectExternalId = insight.campaign_id;
      }

      if (!adObjectExternalId) continue;

      const adObjectId = adObjectMap.get(adObjectExternalId);
      if (!adObjectId) continue;

      const periodDate = new Date(insight.date_start);

      // Build metrics JSONB (everything except normalized fields)
      const metrics: Record<string, unknown> = {};
      if (insight.reach) metrics.reach = insight.reach;
      if (insight.frequency) metrics.frequency = insight.frequency;
      if (insight.cpm) metrics.cpm = insight.cpm;
      if (insight.cpc) metrics.cpc = insight.cpc;
      if (insight.ctr) metrics.ctr = insight.ctr;
      if (insight.actions) metrics.actions = insight.actions;

      spendingsToUpsert.push({
        adObjectId,
        collectedAt: new Date(),
        periodStart: periodDate,
        periodEnd: periodDate, // Daily granularity
        amountCents: BigInt(Math.round(parseFloat(insight.spend || '0') * 100)),
        currency,
        impressions: insight.impressions ? BigInt(insight.impressions) : null,
        clicks: insight.clicks ? BigInt(insight.clicks) : null,
        conversions: null,
        metrics: Object.keys(metrics).length > 0 ? metrics : null,
      });
    }

    if (spendingsToUpsert.length === 0) return;

    // Append-only insert - each sync creates new records
    // collectedAt tracks when data was synced, enabling "current" queries
    const CHUNK_SIZE = 100;

    for (let i = 0; i < spendingsToUpsert.length; i += CHUNK_SIZE) {
      const chunk = spendingsToUpsert.slice(i, i + CHUNK_SIZE);
      await db.insert(spendings).values(chunk);
    }
  }
}

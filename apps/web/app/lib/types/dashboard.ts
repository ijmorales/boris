// Platform types
export type Platform = 'META' | 'GOOGLE_ADS' | 'TIKTOK';

// Ad object types
export type AdObjectType = 'CAMPAIGN' | 'AD_SET' | 'AD';
export type AdObjectStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';

// Ad Account with aggregated spending
export interface AdAccountWithSpending {
  id: string;
  name: string | null;
  platform: Platform;
  currency: string;
  timezone: string;
  clientId: string | null;
  totalSpendCents: number;
  totalImpressions: number;
  totalClicks: number;
}

// Ad Object with spending and metrics
export interface AdObjectWithSpending {
  id: string;
  externalId: string;
  type: AdObjectType;
  name: string | null;
  status: string;
  parentId: string | null;
  parentName: string | null;
  parentType: AdObjectType | null;
  spendCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

// Date range for filtering
export interface DateRange {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

// Pagination
export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Navigation state
export interface NavigationState {
  accountId: string | null;
  parentId: string | null;
  startDate: string;
  endDate: string;
}

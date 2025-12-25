export interface MetaAdAccount {
  id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
}

export interface MetaInsight {
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

export interface MetaPaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: { after?: string };
    next?: string;
  };
}

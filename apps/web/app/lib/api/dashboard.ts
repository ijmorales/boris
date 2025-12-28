import type {
  AdAccountWithSpending,
  AdObjectWithSpending,
  DateRange,
  PaginationInfo,
  Platform,
} from '~/lib/types/dashboard';

// Base API URL - uses Vite proxy in dev, env variable in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Account info returned in meta for objects endpoint
export interface AccountMeta {
  id: string;
  name: string | null;
  platform: Platform;
}

// Pagination parameters
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Response type for ad objects endpoint
export interface AdObjectsResponse {
  data: AdObjectWithSpending[];
  pagination: PaginationInfo;
  meta: {
    account: AccountMeta;
  };
}

// Fetch all ad accounts with aggregated spending
export async function fetchAdAccounts(
  dateRange: DateRange,
): Promise<AdAccountWithSpending[]> {
  const params = new URLSearchParams({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const response = await fetch(
    `${API_BASE_URL}/ad-accounts?${params.toString()}`,
    { credentials: 'include' },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ad accounts: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data;
}

// Fetch ad objects (campaigns, ad sets, or ads)
export async function fetchAdObjects(
  accountId: string,
  parentId: string | null,
  dateRange: DateRange,
  pagination?: PaginationParams,
): Promise<AdObjectsResponse> {
  const params = new URLSearchParams({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  if (parentId) {
    params.set('parentId', parentId);
  }

  if (pagination?.limit !== undefined) {
    params.set('limit', String(pagination.limit));
  }
  if (pagination?.offset !== undefined) {
    params.set('offset', String(pagination.offset));
  }

  const response = await fetch(
    `${API_BASE_URL}/ad-accounts/${accountId}/objects?${params.toString()}`,
    { credentials: 'include' },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ad objects: ${response.statusText}`);
  }

  const json = await response.json();
  return json;
}

// Base API URL - uses Vite proxy in dev, env variable in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Client {
  id: string;
  name: string;
  accountCount: number;
  createdAt: string;
}

export interface AdAccountSummary {
  id: string;
  name: string | null;
  platform: 'META' | 'GOOGLE_ADS' | 'TIKTOK';
  clientId: string | null;
  currency: string;
  totalSpendCents: number;
}

export async function fetchClients(): Promise<Client[]> {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch clients: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data;
}

export async function createClient(name: string): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to create client: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data;
}

export async function deleteClient(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete client: ${response.statusText}`);
  }
}

export async function fetchAdAccounts(): Promise<AdAccountSummary[]> {
  // Use a wide date range to get all accounts regardless of spending
  const startDate = '2020-01-01';
  const endDate = new Date().toISOString().split('T')[0];

  const response = await fetch(
    `${API_BASE_URL}/ad-accounts?startDate=${startDate}&endDate=${endDate}`,
    { credentials: 'include' },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ad accounts: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data.map(
    (
      account: AdAccountSummary & { currency: string; totalSpendCents: number },
    ) => ({
      id: account.id,
      name: account.name,
      platform: account.platform,
      clientId: account.clientId,
      currency: account.currency,
      totalSpendCents: account.totalSpendCents,
    }),
  );
}

export async function assignAccountToClient(
  accountId: string,
  clientId: string | null,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ad-accounts/${accountId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to assign account: ${response.statusText}`);
  }
}

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AdAccountCard } from '~/components/dashboard/ad-account-card';
import {
  type BreadcrumbItem,
  BreadcrumbNav,
} from '~/components/dashboard/breadcrumb-nav';
import { DateRangePicker } from '~/components/dashboard/date-range-picker';
import { MetricsSummary } from '~/components/dashboard/metrics-summary';
import { ObjectsTable } from '~/components/dashboard/objects-table';
import { Button } from '~/components/ui/button';
import { type Client, fetchClients } from '~/lib/api/clients';
import {
  type AccountMeta,
  fetchAdAccounts,
  fetchAdObjects,
} from '~/lib/api/dashboard';
import type {
  AdAccountWithSpending,
  AdObjectWithSpending,
} from '~/lib/types/dashboard';
import { getDefaultDateRange } from '~/lib/utils/dates';

export function DashboardContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Navigation state from URL
  const accountId = searchParams.get('accountId');
  const parentId = searchParams.get('parentId');
  const urlStartDate = searchParams.get('startDate');
  const urlEndDate = searchParams.get('endDate');
  const urlClientId = searchParams.get('clientId');

  // Date range state
  const defaultRange = getDefaultDateRange();
  const startDate = urlStartDate || defaultRange.startDate;
  const endDate = urlEndDate || defaultRange.endDate;

  // State management
  const [accounts, setAccounts] = useState<AdAccountWithSpending[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    urlClientId,
  );
  const [objects, setObjects] = useState<AdObjectWithSpending[]>([]);
  const [currentAccount, setCurrentAccount] = useState<AccountMeta | null>(
    null,
  );
  const [currentAccountCurrency, setCurrentAccountCurrency] = useState('USD');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache account currencies to avoid refetching
  const currencyCache = useRef<Map<string, string>>(new Map());

  // Cache names for breadcrumbs to prevent flicker during navigation
  const accountNameCache = useRef<Map<string, string>>(new Map());
  const objectNameCache = useRef<Map<string, string>>(new Map());

  // Fetch clients on mount
  useEffect(() => {
    fetchClients()
      .then(setClients)
      .catch((err) => console.error('Failed to fetch clients:', err));
  }, []);

  // Only show spinner after a delay to avoid flash for fast fetches
  useEffect(() => {
    if (!isFetching) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), 150);
    return () => clearTimeout(timer);
  }, [isFetching]);

  // Navigation helper
  const buildUrl = useCallback(
    (
      newAccountId: string | null,
      newParentId: string | null,
      newStartDate?: string,
      newEndDate?: string,
      newClientId?: string | null,
    ) => {
      const params = new URLSearchParams();
      if (newAccountId) params.set('accountId', newAccountId);
      if (newParentId) params.set('parentId', newParentId);
      params.set('startDate', newStartDate || startDate);
      params.set('endDate', newEndDate || endDate);
      // Use provided clientId, or fall back to current selection
      const clientIdToUse =
        newClientId !== undefined ? newClientId : selectedClientId;
      if (clientIdToUse) params.set('clientId', clientIdToUse);
      return `/dashboard?${params.toString()}`;
    },
    [startDate, endDate, selectedClientId],
  );

  // Navigation functions
  const navigateToRoot = useCallback(() => {
    navigate(buildUrl(null, null));
  }, [navigate, buildUrl]);

  const navigateToAccount = useCallback(
    (account: AdAccountWithSpending) => {
      navigate(buildUrl(account.id, null));
    },
    [navigate, buildUrl],
  );

  const navigateToObject = useCallback(
    (object: AdObjectWithSpending) => {
      if (object.type === 'AD') return; // Ads are terminal, can't drill down
      navigate(buildUrl(accountId, object.id));
    },
    [navigate, buildUrl, accountId],
  );

  // Build breadcrumbs using cached names to prevent flicker
  const breadcrumbs: BreadcrumbItem[] = [
    { id: null, name: 'Ad Accounts', onClick: navigateToRoot },
  ];

  if (accountId) {
    const accountName =
      currentAccount?.name ||
      accountNameCache.current.get(accountId) ||
      'Account';
    breadcrumbs.push({
      id: accountId,
      name: accountName,
      onClick: () => navigate(buildUrl(accountId, null)),
    });
  }

  if (parentId) {
    const parentName =
      (objects.length > 0 && objects[0].parentName) ||
      objectNameCache.current.get(parentId) ||
      'Campaign';
    breadcrumbs.push({
      id: parentId,
      name: parentName,
      onClick: () => navigate(buildUrl(accountId, parentId)),
    });
  }

  const navigateBack = useCallback(() => {
    if (parentId) {
      // Go up one level - to account campaigns
      navigate(buildUrl(accountId, null));
    } else if (accountId) {
      // Go to accounts list
      navigateToRoot();
    }
  }, [navigate, buildUrl, accountId, parentId, navigateToRoot]);

  // Handle date range changes
  const handleDateRangeChange = useCallback(
    (newStartDate: string, newEndDate: string) => {
      navigate(buildUrl(accountId, parentId, newStartDate, newEndDate));
    },
    [navigate, buildUrl, accountId, parentId],
  );

  // Handle client filter changes
  const handleClientChange = useCallback(
    (clientId: string | null) => {
      setSelectedClientId(clientId);
      navigate(buildUrl(null, null, startDate, endDate, clientId));
    },
    [navigate, buildUrl, startDate, endDate],
  );

  // Fetch data based on current navigation state
  useEffect(() => {
    const loadData = async () => {
      setIsFetching(true);
      setError(null);

      const dateRange = { startDate, endDate };

      try {
        if (!accountId) {
          // Load ad accounts
          const accountsData = await fetchAdAccounts(dateRange);
          setAccounts(accountsData);
          setObjects([]);
          setCurrentAccount(null);

          // Cache all account currencies and names for later use
          for (const account of accountsData) {
            currencyCache.current.set(account.id, account.currency);
            if (account.name) {
              accountNameCache.current.set(account.id, account.name);
            }
          }
        } else if (accountId) {
          // Load ad objects for the selected account/parent
          const response = await fetchAdObjects(accountId, parentId, dateRange);
          setObjects(response.data);

          // Cache object names for breadcrumbs
          for (const obj of response.data) {
            if (obj.name) {
              objectNameCache.current.set(obj.id, obj.name);
            }
          }

          // Use account info from response meta (no extra API call needed)
          setCurrentAccount(response.meta.account);
          if (response.meta.account?.name) {
            accountNameCache.current.set(accountId, response.meta.account.name);
          }

          // Get currency from cache if available
          const cachedCurrency = currencyCache.current.get(accountId);
          if (cachedCurrency) {
            setCurrentAccountCurrency(cachedCurrency);
          } else {
            // Only fetch accounts if we don't have the currency cached
            const accountsData = await fetchAdAccounts(dateRange);
            const account = accountsData.find((a) => a.id === accountId);
            if (account) {
              setCurrentAccountCurrency(account.currency);
              currencyCache.current.set(accountId, account.currency);
            }
          }
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsFetching(false);
        setIsFirstLoad(false);
      }
    };

    loadData();
  }, [accountId, parentId, startDate, endDate]);

  // Filter accounts by selected client
  const filteredAccounts = useMemo(() => {
    if (!selectedClientId) return accounts;
    return accounts.filter((account) => account.clientId === selectedClientId);
  }, [accounts, selectedClientId]);

  // Get selected client name for display
  const selectedClientName = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId)?.name || null;
  }, [clients, selectedClientId]);

  // Calculate aggregated metrics for current view
  const aggregatedMetrics = useMemo(
    () =>
      objects.reduce(
        (acc, obj) => ({
          totalSpendCents: acc.totalSpendCents + obj.spendCents,
          totalImpressions: acc.totalImpressions + obj.impressions,
          totalClicks: acc.totalClicks + obj.clicks,
          totalConversions: acc.totalConversions + (obj.conversions || 0),
        }),
        {
          totalSpendCents: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
        },
      ),
    [objects],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Boris Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Hierarchical Ad Objects Explorer
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Client Filter */}
            {clients.length > 0 && !accountId && (
              <select
                className="text-sm border rounded px-3 py-2 bg-background"
                value={selectedClientId || ''}
                onChange={(e) => handleClientChange(e.target.value || null)}
              >
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {breadcrumbs.length > 1 && (
          <div className="mb-6">
            <BreadcrumbNav items={breadcrumbs} />
          </div>
        )}

        {/* Back Button */}
        {(accountId || parentId) && (
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={navigateBack}
              className="gap-2 bg-transparent"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </div>
        )}

        {/* Loading State - only show on first load or after delay */}
        {isFirstLoad && showSpinner && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {/* Content - show stale content while fetching, hide only on first load */}
        {!isFirstLoad && !error && (
          <>
            {/* Ad Accounts View */}
            {!accountId && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">
                    {selectedClientName
                      ? `${selectedClientName} - Ad Accounts`
                      : 'Ad Accounts'}
                  </h2>
                  {selectedClientId && (
                    <span className="text-sm text-muted-foreground">
                      {filteredAccounts.length} of {accounts.length} accounts
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAccounts.map((account) => (
                    <AdAccountCard
                      key={account.id}
                      account={account}
                      onClick={() => navigateToAccount(account)}
                    />
                  ))}
                </div>
                {filteredAccounts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>
                      {selectedClientId
                        ? 'No ad accounts assigned to this client.'
                        : 'No ad accounts found for the selected period.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Ad Objects View (Campaigns, Ad Sets, Ads) */}
            {accountId && currentAccount && (
              <div className="space-y-6">
                {/* Metrics Summary */}
                {objects.length > 0 && (
                  <MetricsSummary
                    totalSpendCents={aggregatedMetrics.totalSpendCents}
                    totalImpressions={aggregatedMetrics.totalImpressions}
                    totalClicks={aggregatedMetrics.totalClicks}
                    totalConversions={aggregatedMetrics.totalConversions}
                    currency={currentAccountCurrency}
                  />
                )}

                {/* Objects Table */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4">
                    {!parentId
                      ? 'Campaigns'
                      : objects[0]?.type === 'AD_SET'
                        ? 'Ad Sets'
                        : objects[0]?.type === 'AD'
                          ? 'Ads'
                          : 'Objects'}
                  </h2>
                  <ObjectsTable
                    objects={objects}
                    currency={currentAccountCurrency}
                    onObjectClick={navigateToObject}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

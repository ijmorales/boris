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

  // Date range state
  const defaultRange = getDefaultDateRange();
  const startDate = urlStartDate || defaultRange.startDate;
  const endDate = urlEndDate || defaultRange.endDate;

  // State management
  const [accounts, setAccounts] = useState<AdAccountWithSpending[]>([]);
  const [objects, setObjects] = useState<AdObjectWithSpending[]>([]);
  const [currentAccount, setCurrentAccount] = useState<AccountMeta | null>(
    null,
  );
  const [currentAccountCurrency, setCurrentAccountCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache account currencies to avoid refetching
  const currencyCache = useRef<Map<string, string>>(new Map());

  // Navigation helper
  const buildUrl = useCallback(
    (
      newAccountId: string | null,
      newParentId: string | null,
      newStartDate?: string,
      newEndDate?: string,
    ) => {
      const params = new URLSearchParams();
      if (newAccountId) params.set('accountId', newAccountId);
      if (newParentId) params.set('parentId', newParentId);
      params.set('startDate', newStartDate || startDate);
      params.set('endDate', newEndDate || endDate);
      return `/dashboard?${params.toString()}`;
    },
    [startDate, endDate],
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

  // Build breadcrumbs based on current state
  const breadcrumbs: BreadcrumbItem[] = [
    { id: null, name: 'Ad Accounts', onClick: navigateToRoot },
  ];

  if (accountId && currentAccount) {
    breadcrumbs.push({
      id: accountId,
      name: currentAccount.name || 'Account',
      onClick: () => navigate(buildUrl(accountId, null)),
    });
  }

  if (parentId && objects.length > 0 && objects[0].parentName) {
    breadcrumbs.push({
      id: parentId,
      name: objects[0].parentName,
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

  // Fetch data based on current navigation state
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const dateRange = { startDate, endDate };

      try {
        if (!accountId) {
          // Load ad accounts
          const accountsData = await fetchAdAccounts(dateRange);
          setAccounts(accountsData);
          setObjects([]);
          setCurrentAccount(null);

          // Cache all account currencies for later use
          for (const account of accountsData) {
            currencyCache.current.set(account.id, account.currency);
          }
        } else {
          // Load ad objects for the selected account/parent
          const response = await fetchAdObjects(accountId, parentId, dateRange);
          setObjects(response.data);

          // Use account info from response meta (no extra API call needed)
          setCurrentAccount(response.meta.account);

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
        setLoading(false);
      }
    };

    loadData();
  }, [accountId, parentId, startDate, endDate]);

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
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
          />
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

        {/* Loading State */}
        {loading && (
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

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Ad Accounts View */}
            {!accountId && (
              <div>
                <h2 className="text-2xl font-semibold mb-6">Ad Accounts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {accounts.map((account) => (
                    <AdAccountCard
                      key={account.id}
                      account={account}
                      onClick={() => navigateToAccount(account)}
                    />
                  ))}
                </div>
                {accounts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No ad accounts found for the selected period.</p>
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

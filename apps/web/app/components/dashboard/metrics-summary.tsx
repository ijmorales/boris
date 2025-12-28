import { Card, CardContent } from '~/components/ui/card';
import {
  calculateCTR,
  formatCurrency,
  formatNumber,
  formatPercentage,
} from '~/lib/utils/currency';

interface MetricsSummaryProps {
  totalSpendCents: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions?: number;
  currency?: string;
}

export function MetricsSummary({
  totalSpendCents,
  totalImpressions,
  totalClicks,
  totalConversions,
  currency = 'USD',
}: MetricsSummaryProps) {
  const ctr = calculateCTR(totalClicks, totalImpressions);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Total Spend</div>
          <div className="text-2xl font-bold mt-1">
            {formatCurrency(totalSpendCents, currency)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Impressions</div>
          <div className="text-2xl font-bold mt-1">
            {formatNumber(totalImpressions)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Clicks</div>
          <div className="text-2xl font-bold mt-1">
            {formatNumber(totalClicks)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">CTR</div>
          <div className="text-2xl font-bold mt-1">{formatPercentage(ctr)}</div>
        </CardContent>
      </Card>

      {totalConversions !== undefined && totalConversions > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Conversions</div>
            <div className="text-2xl font-bold mt-1">
              {formatNumber(totalConversions)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

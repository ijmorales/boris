import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import type { AdAccountWithSpending } from '~/lib/types/dashboard';
import { formatCurrency } from '~/lib/utils/currency';
import { PlatformBadge } from './platform-badge';

interface AdAccountCardProps {
  account: AdAccountWithSpending;
  onClick: () => void;
}

export function AdAccountCard({ account, onClick }: AdAccountCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <PlatformBadge platform={account.platform} />
        </div>
        <CardTitle className="text-lg mt-2">
          {account.name || 'Unnamed Account'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <div className="text-3xl font-bold">
              {formatCurrency(account.totalSpendCents, account.currency)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {account.currency} • {account.timezone}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

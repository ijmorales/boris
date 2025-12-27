import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
import type { AdObjectWithSpending } from '~/lib/types/dashboard';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from '~/lib/utils/currency';
import { StatusBadge } from './status-badge';

interface ObjectsTableProps {
  objects: AdObjectWithSpending[];
  currency: string;
  onObjectClick: (object: AdObjectWithSpending) => void;
  showDrillDown?: boolean;
}

export function ObjectsTable({
  objects,
  currency,
  onObjectClick,
  showDrillDown = true,
}: ObjectsTableProps) {
  if (objects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No data available for the selected period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium text-sm">Name</th>
                <th className="text-left p-4 font-medium text-sm">Status</th>
                <th className="text-right p-4 font-medium text-sm">Spend</th>
                <th className="text-right p-4 font-medium text-sm">
                  Impressions
                </th>
                <th className="text-right p-4 font-medium text-sm">Clicks</th>
                <th className="text-right p-4 font-medium text-sm">CTR</th>
                {showDrillDown && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {objects.map((object) => {
                const isTerminal = object.type === 'AD';

                return (
                  <tr
                    key={object.id}
                    className={`border-b last:border-b-0 ${!isTerminal && showDrillDown ? 'cursor-pointer hover:bg-muted/30' : ''}`}
                    onClick={() =>
                      !isTerminal && showDrillDown && onObjectClick(object)
                    }
                  >
                    <td className="p-4">
                      <div className="font-medium">
                        {object.name || 'Unnamed'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {object.type.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={object.status} />
                    </td>
                    <td className="p-4 text-right font-medium">
                      {formatCurrency(object.spendCents, currency)}
                    </td>
                    <td className="p-4 text-right">
                      {formatNumber(object.impressions)}
                    </td>
                    <td className="p-4 text-right">
                      {formatNumber(object.clicks)}
                    </td>
                    <td className="p-4 text-right">
                      {formatPercentage(object.ctr)}
                    </td>
                    {showDrillDown && (
                      <td className="p-4">
                        {!isTerminal && (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

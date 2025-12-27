import { ChevronRight } from 'lucide-react';
import { Button } from '~/components/ui/button';

export interface BreadcrumbItem {
  id: string | null;
  name: string;
  onClick: () => void;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
      {items.map((item, index) => (
        <div key={item.id || 'root'} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          )}
          {index === items.length - 1 ? (
            <span className="font-medium text-foreground whitespace-nowrap">
              {item.name}
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={item.onClick}
              className="h-auto p-1 whitespace-nowrap"
            >
              {item.name}
            </Button>
          )}
        </div>
      ))}
    </nav>
  );
}

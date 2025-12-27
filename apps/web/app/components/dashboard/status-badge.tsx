import { Badge } from '~/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          label: 'Active',
          className: 'bg-green-500 text-white border-green-500',
        };
      case 'PAUSED':
        return {
          label: 'Paused',
          className: 'bg-yellow-500 text-white border-yellow-500',
        };
      case 'ARCHIVED':
        return {
          label: 'Archived',
          className: 'bg-gray-400 text-white border-gray-400',
        };
      case 'DELETED':
        return {
          label: 'Deleted',
          className: 'bg-red-500 text-white border-red-500',
        };
      default:
        return {
          label: status,
          className: 'bg-gray-300 text-gray-700 border-gray-300',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant="default"
      className={`${config.className} ${className || ''}`}
    >
      {config.label}
    </Badge>
  );
}

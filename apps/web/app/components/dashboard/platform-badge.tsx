import { Badge } from '~/components/ui/badge';
import type { Platform } from '~/lib/types/dashboard';

interface PlatformBadgeProps {
  platform: Platform;
  className?: string;
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const getPlatformConfig = (platform: Platform) => {
    switch (platform) {
      case 'META':
        return {
          label: 'Meta',
          className: 'bg-[#0866FF] text-white border-[#0866FF]',
        };
      case 'GOOGLE_ADS':
        return {
          label: 'Google Ads',
          className: 'bg-[#4285F4] text-white border-[#4285F4]',
        };
      case 'TIKTOK':
        return {
          label: 'TikTok',
          className: 'bg-black text-white border-black',
        };
    }
  };

  const config = getPlatformConfig(platform);

  return (
    <Badge
      variant="default"
      className={`${config.className} ${className || ''}`}
    >
      {config.label}
    </Badge>
  );
}

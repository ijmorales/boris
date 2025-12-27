// Format cents to currency string
export function formatCurrency(cents: number, currency = 'USD'): string {
  const amount = cents / 100;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// Format large numbers (1.2M, 45K, etc.)
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// Calculate CTR (Click-Through Rate)
export function calculateCTR(clicks: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

// Format percentage
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

// Format metric value based on type
export function formatMetric(
  value: number | null | undefined,
  type: 'currency' | 'number' | 'percentage',
  currency?: string,
): string {
  if (value === null || value === undefined) {
    return '-';
  }

  switch (type) {
    case 'currency':
      return formatCurrency(value, currency);
    case 'percentage':
      return formatPercentage(value);
    case 'number':
      return formatNumber(value);
    default:
      return String(value);
  }
}

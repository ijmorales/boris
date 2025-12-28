// Get date range presets
export interface DateRangePreset {
  label: string;
  startDate: string;
  endDate: string;
}

export function getDateRangePresets(): DateRangePreset[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 7);

  const last30Days = new Date(today);
  last30Days.setDate(last30Days.getDate() - 30);

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  return [
    {
      label: 'Today',
      startDate: today.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    },
    {
      label: 'Yesterday',
      startDate: yesterday.toISOString().split('T')[0],
      endDate: yesterday.toISOString().split('T')[0],
    },
    {
      label: 'Last 7 days',
      startDate: last7Days.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    },
    {
      label: 'Last 30 days',
      startDate: last30Days.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    },
    {
      label: 'This month',
      startDate: thisMonthStart.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    },
    {
      label: 'Last month',
      startDate: lastMonthStart.toISOString().split('T')[0],
      endDate: lastMonthEnd.toISOString().split('T')[0],
    },
  ];
}

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Get default date range (last 7 days)
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 7);

  return {
    startDate: last7Days.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  };
}

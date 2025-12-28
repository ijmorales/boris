import { DashboardContent } from '~/components/dashboard/dashboard-content';

export function meta() {
  return [
    { title: 'Dashboard | Boris' },
    { name: 'description', content: 'Boris Ad Spend Dashboard' },
  ];
}

export default function Dashboard() {
  return <DashboardContent />;
}

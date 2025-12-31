import type { RouteConfig } from '@react-router/dev/routes';
import { index, layout, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  layout('routes/_authenticated.tsx', [
    route('dashboard', 'routes/dashboard.tsx'),
    route('clients', 'routes/clients.tsx'),
    route('team', 'routes/users.tsx'),
  ]),
] satisfies RouteConfig;

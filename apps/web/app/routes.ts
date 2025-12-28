import type { RouteConfig } from '@react-router/dev/routes';
import { index, layout, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  layout('routes/_authenticated.tsx', [
    route('users', 'routes/users.tsx'),
    route('dashboard', 'routes/dashboard.tsx'),
  ]),
] satisfies RouteConfig;

import { useLoaderData } from 'react-router';
import { Header } from '../components/header';
import type { Route } from './+types/users';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const apiBase = url.origin.replace(':5173', ':4000');

  try {
    const response = await fetch(`${apiBase}/api/users`);
    if (!response.ok) {
      return { users: [], error: 'Failed to fetch users' };
    }
    const users: User[] = await response.json();
    return { users, error: null };
  } catch {
    return { users: [], error: 'API unavailable' };
  }
}

export function meta() {
  return [{ title: 'Users - Boris' }];
}

export default function Users() {
  const { users, error } = useLoaderData<typeof loader>();

  return (
    <>
      <Header />
      <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>Users</h1>

        {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

        {users.length === 0 && !error && (
          <p style={{ marginTop: '1rem' }}>No users found.</p>
        )}

        {users.length > 0 && (
          <ul style={{ marginTop: '1rem' }}>
            {users.map((user) => (
              <li key={user.id}>
                {user.name} ({user.email})
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

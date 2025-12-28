import type { Route } from './+types/users';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export async function clientLoader() {
  try {
    const response = await fetch('/api/users', {
      credentials: 'include',
    });
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

export default function Users({ loaderData }: Route.ComponentProps) {
  return <UsersContent loaderData={loaderData} />;
}

function UsersContent({
  loaderData,
}: {
  loaderData: Route.ComponentProps['loaderData'];
}) {
  const { users, error } = loaderData;

  return (
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
  );
}

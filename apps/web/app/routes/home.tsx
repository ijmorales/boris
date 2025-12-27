import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from '@clerk/react-router';
import { Link } from 'react-router';

export function meta() {
  return [
    { title: 'Boris - Paid Media Observability' },
    { name: 'description', content: 'Track and analyze your ad spend' },
  ];
}

export default function Home() {
  const { user } = useUser();

  return (
    <>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          borderBottom: '1px solid #eee',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Boris</h1>
        <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <SignedOut>
            <SignInButton mode="modal" />
            <SignUpButton mode="modal" />
          </SignedOut>
          <SignedIn>
            <span style={{ marginRight: '0.5rem' }}>
              Hello, {user?.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton />
          </SignedIn>
        </nav>
      </header>
      <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <SignedOut>
          <h2>Welcome to Boris</h2>
          <p>Sign in to view your ad spend analytics.</p>
        </SignedOut>
        <SignedIn>
          <h2>Dashboard</h2>
          <p>Your ad spend data will appear here.</p>
          <nav>
            <ul>
              <li>
                <Link to="/users">Users</Link>
              </li>
            </ul>
          </nav>
        </SignedIn>
      </main>
    </>
  );
}

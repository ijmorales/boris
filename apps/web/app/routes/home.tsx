import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Link } from 'react-router';
import { Header } from '../components/header';
import type { Route } from './+types/home';

export const meta: Route.MetaFunction = () => [
  { title: 'Boris - Paid Media Observability' },
  { name: 'description', content: 'Track and analyze your ad spend' },
];

export default function Home() {
  return (
    <>
      <Header />
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
                <Link to="/dashboard">Dashboard</Link>
              </li>
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

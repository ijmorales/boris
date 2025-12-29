import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/clerk-react';
import { Link } from 'react-router';

export function Header() {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid #eee',
      }}
    >
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Boris</h1>
      </Link>
      <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <SignedIn>
          <Link
            to="/dashboard"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Dashboard
          </Link>
          <Link
            to="/clients"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Clients
          </Link>
          <Link
            to="/team"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Team
          </Link>
          <UserButton showName />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal" />
          <SignUpButton mode="modal" />
        </SignedOut>
      </nav>
    </header>
  );
}

import { Link } from 'react-router';

export function meta() {
  return [
    { title: 'Boris' },
    { name: 'description', content: 'Welcome to Boris' },
  ];
}

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Boris</h1>
      <p>Welcome to Boris.</p>
      <nav>
        <ul>
          <li>
            <Link to="/users">Users</Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}

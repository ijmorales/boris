import { RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import { Outlet } from 'react-router';
import { Header } from '~/components/header';

export default function AuthenticatedLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  // Don't render anything until Clerk has loaded - prevents flash
  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

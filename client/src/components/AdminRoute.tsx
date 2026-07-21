import { RedirectToSignIn } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { useMe } from '../hooks/useMe';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  // Admin status comes from the app's own users table via /api/me — the same
  // source of truth the server's AdminOnly policy checks (#33). Clerk metadata
  // is never consulted: nothing in the system maintains it.
  const { isLoading, isSignedIn, isAdmin } = useMe();

  if (isLoading) return <div className="p-8 text-center text-on-surface-muted">Loading…</div>;
  if (!isSignedIn) return <RedirectToSignIn />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}

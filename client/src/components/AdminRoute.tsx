import { useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return <div className="p-8 text-center text-[#404942]">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  const role = user.publicMetadata?.role as string | undefined;
  if (role !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
}

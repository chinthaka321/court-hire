import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/clerk-react';
import { getMe } from '../lib/api';
import type { UserRole, SkillLevel } from '../types';

export interface Me {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  skillLevel: SkillLevel;
}

/**
 * The app's own user profile — the DB row is the source of truth for `role`
 * (see ADR-0006), NOT Clerk metadata. Admin gating must use this.
 */
export function useMe() {
  const { user, isLoaded } = useUser();

  // The Clerk session JWT the backend verifies usually only carries `sub` —
  // send email/name from this client-side Clerk session so the backend can
  // provision the DB user row with real values instead of falling back to
  // the raw Clerk user ID (see server UserService.EnsureUserAsync).
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;
  const name = user?.fullName ?? user?.firstName ?? undefined;

  const { data: me, isLoading } = useQuery<Me>({
    queryKey: ['me', email, name],
    queryFn: () => getMe({ email, name }),
    enabled: isLoaded && !!user,
    staleTime: 60_000,
  });

  return {
    me,
    isAdmin: me?.role === 'Admin',
    // Loading until Clerk resolves; then, if signed in, until /api/me resolves
    isLoading: !isLoaded || (!!user && isLoading),
    isSignedIn: !!user,
  };
}

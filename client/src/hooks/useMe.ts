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

  const { data: me, isLoading } = useQuery<Me>({
    queryKey: ['me'],
    queryFn: getMe,
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

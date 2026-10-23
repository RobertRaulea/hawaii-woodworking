import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { hasPermission } from '../../convex/lib/permissions';
import type { Permission } from '../../convex/lib/permissions';

/**
 * Staff access resolved by the backend (convex/staff.me). The frontend
 * never reads Clerk metadata for authorization.
 */
export const useStaffAccess = () => {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const staff = useQuery(api.staff.me, isAuthenticated ? {} : 'skip');
  const role = staff?.role ?? null;

  return {
    isLoading: authLoading || (isAuthenticated && staff === undefined),
    isAuthenticated,
    role,
    userId: staff?.userId ?? null,
    homePath: staff?.homePath ?? null,
    can: (permission: Permission) => hasPermission(role, permission),
  };
};

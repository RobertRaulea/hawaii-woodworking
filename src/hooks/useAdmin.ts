import { useUser } from '@clerk/clerk-react';

/**
 * Returns whether the current Clerk user has the "admin" role
 * set in their publicMetadata.
 */
export const useAdmin = () => {
  const { user, isLoaded } = useUser();

  const isAdmin =
    isLoaded && user?.publicMetadata?.role === 'admin';

  return { isAdmin, isLoaded };
};

import { useAuth } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Fetches the saved customer profile for the currently signed-in Clerk user.
 * Returns null when not signed in or when no customer record exists yet.
 */
export const useCustomerProfile = () => {
  const { userId, isSignedIn } = useAuth();

  const customer = useQuery(
    api.customers.getByClerkUserId,
    isSignedIn && userId ? { clerkUserId: userId } : 'skip'
  );

  return {
    customer: customer ?? null,
    isLoading: isSignedIn && customer === undefined,
    isSignedIn: !!isSignedIn,
  };
};

import { useAuth } from '@clerk/clerk-react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Fetches the saved customer profile for the currently signed-in Clerk user.
 * Returns null when not signed in or when no customer record exists yet.
 */
export const useCustomerProfile = () => {
 const { isSignedIn } = useAuth();
 const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

 const customer = useQuery(
 api.customers.getByClerkUserId,
 isSignedIn && isAuthenticated ? {} : 'skip'
 );

 return {
 customer: customer ?? null,
 isLoading: !!isSignedIn && (isAuthLoading || !isAuthenticated || customer === undefined),
 isSignedIn: !!isSignedIn,
 };
};

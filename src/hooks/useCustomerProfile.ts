import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

type SyncState = 'idle' | 'pending' | 'linked' | 'none';

/**
 * Fetches the saved customer profile for the currently signed-in Clerk user.
 * Returns null when not signed in or when no customer record exists yet.
 *
 * Guest-era customer rows predate clerkUserId, so a missing row does not
 * mean "no profile": once the query resolves to null we ask the backend to
 * link the row by verified account email (customers.syncMyProfile), then
 * keep reporting loading until the query reactively delivers it.
 */
export const useCustomerProfile = () => {
 const { isSignedIn } = useAuth();
 const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
 const [syncState, setSyncState] = useState<SyncState>('idle');
 const syncMyProfile = useMutation(api.customers.syncMyProfile);

 const customer = useQuery(
 api.customers.getByClerkUserId,
 isSignedIn && isAuthenticated ? {} : 'skip'
 );

 useEffect(() => {
 if (!isSignedIn || !isAuthenticated) {
 setSyncState('idle');
 return;
 }
 if (customer !== null || syncState !== 'idle') return;
 setSyncState('pending');
 void syncMyProfile()
 .then((linked) => setSyncState(linked ? 'linked' : 'none'))
 .catch(() => setSyncState('none'));
 }, [isSignedIn, isAuthenticated, customer, syncState, syncMyProfile]);

 return {
 customer: customer ?? null,
 isLoading:
 !!isSignedIn &&
 (isAuthLoading ||
 !isAuthenticated ||
 customer === undefined ||
 (customer === null && syncState !== 'none')),
 isSignedIn: !!isSignedIn,
 };
};

import { useCallback, useMemo } from 'react';
import { api } from '../../convex/_generated/api';
import { useAdminQuery } from './useAdminQuery';

export interface StaffDirectoryEntry {
 userId: string;
 email: string;
 name?: string;
 role?: string;
}

/**
 * Raw staff directory entries keyed by Clerk user id. Used for avatar
 * initials and staff pickers where the display label alone is not enough.
 */
export const useStaffDirectoryEntries = () => {
 const { data } = useAdminQuery(api.staff.directory, {});
 return useMemo(
 () =>
 new Map<string, StaffDirectoryEntry>(
 (Array.isArray(data) ? data : []).map((entry) => [
 entry.userId,
 entry,
 ]),
 ),
 [data],
 );
};

/**
 * Maps stored Clerk user ids to staff names/emails for display. Falls back
 * to the raw id for accounts the directory has not recorded yet.
 */
export const useStaffDirectory = () => {
 const entries = useStaffDirectoryEntries();
 return useCallback(
 (userId: string | null | undefined): string => {
 if (!userId) return '—';
 if (userId.startsWith('system:')) return 'Sistem';
 const entry = entries.get(userId);
 return entry?.name ?? entry?.email ?? userId;
 },
 [entries],
 );
};

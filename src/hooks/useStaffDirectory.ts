import { useCallback, useMemo } from 'react';
import { api } from '../../convex/_generated/api';
import { useAdminQuery } from './useAdminQuery';

/**
 * Maps stored Clerk user ids to staff emails for display. Falls back to
 * the raw id for accounts the directory has not recorded yet.
 */
export const useStaffDirectory = () => {
  const { data } = useAdminQuery(api.staff.directory, {});
  const emails = useMemo(
    () =>
      new Map(
        (Array.isArray(data) ? data : []).map((entry) => [
          entry.userId,
          entry.email,
        ]),
      ),
    [data],
  );
  return useCallback(
    (userId: string | null | undefined): string => {
      if (!userId) return '—';
      if (userId.startsWith('system:')) return 'Sistem';
      return emails.get(userId) ?? userId;
    },
    [emails],
  );
};

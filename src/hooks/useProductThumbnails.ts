import { useMemo } from 'react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAdminQuery } from './useAdminQuery';

/**
 * Product id → first image URL, for every product (including archived or
 * inactive ones). Used to show identification thumbnails in admin views.
 * An empty map is returned while loading or when the query is unavailable,
 * so thumbnails degrade gracefully to the placeholder.
 */
export const useProductThumbnails = (): Map<Id<'products'>, string> => {
  const { data } = useAdminQuery(api.products.thumbnails, {});
  return useMemo(
    () =>
      new Map(
        (Array.isArray(data) ? data : [])
          .filter((thumb) => thumb.url !== null)
          .map((thumb) => [thumb.id, thumb.url as string]),
      ),
    [data],
  );
};

import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { SiteAsset } from '../types/siteAsset.types';

export type { SiteAsset } from '../types/siteAsset.types';

export const useSiteAssets = (category: string) => {
  const data = useQuery(api.siteAssets.getByCategory, { category });

  const assets = useMemo<SiteAsset[]>(() => {
    if (!data) {
      return [];
    }

    return data.map((asset) => ({
      id: asset._id,
      name: asset.name,
      category: asset.category,
      url: asset.url,
    }));
  }, [data]);

  const loading = data === undefined;

  return { assets, loading, error: null };
};

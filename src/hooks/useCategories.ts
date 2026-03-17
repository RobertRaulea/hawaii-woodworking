import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Category } from '../types/category.types';

export type { Category } from '../types/category.types';

export const useCategories = () => {
  const data = useQuery(api.categories.getAll);

  const categories = useMemo<Category[]>(() => {
    if (!data) {
      return [];
    }

    return data.map((category) => ({
      id: category._id,
      name: category.name,
    }));
  }, [data]);

  const loading = data === undefined;

  return { categories, loading, error: null };
};

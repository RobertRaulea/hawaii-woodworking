import type { Category } from '../../types/category.types';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryChange: (categoryName: string) => void;
  productCounts: Record<string, number>;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategories,
  onCategoryChange,
  productCounts,
}) => {
  return (
    <div className="space-y-2">
      {categories.map((category) => {
        const count = productCounts[category.name] || 0;
        const isSelected = selectedCategories.includes(category.name);

        return (
          <label
            key={category.id}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onCategoryChange(category.name)}
              className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-stone-700 group-hover:text-stone-900 flex-1">
              {category.name}
            </span>
            <span className="text-xs text-stone-500">({count})</span>
          </label>
        );
      })}
    </div>
  );
};

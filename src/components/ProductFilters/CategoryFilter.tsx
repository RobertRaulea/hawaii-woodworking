import type { Category } from '../../types/category.types';
import { Checkbox } from '@/components/ui/checkbox';

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
 const checkboxId = `filter-category-${category.id}`;

 return (
 <label
 key={category.id}
 htmlFor={checkboxId}
 className="flex items-center gap-2 cursor-pointer group"
 >
 <Checkbox
 id={checkboxId}
 checked={isSelected}
 onCheckedChange={() => onCategoryChange(category.name)}
 className="h-4 w-4 cursor-pointer"
 />
 <span className="text-sm text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-50 flex-1">
 {category.name}
 </span>
 <span className="text-xs text-stone-500 dark:text-stone-400 ">({count})</span>
 </label>
 );
 })}
 </div>
 );
};

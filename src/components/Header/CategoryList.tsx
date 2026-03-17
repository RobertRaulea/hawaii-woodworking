import React from 'react';
import type { Category } from '../../types/category.types';

interface CategoryListProps {
  categories: Category[];
  onCategoryClick: (name: string) => void;
  onAllProductsClick: () => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onCategoryClick,
  onAllProductsClick,
}) => {
  return (
    <div className="px-2 space-y-0.5">
      <button
        onClick={onAllProductsClick}
        className="w-full text-left px-3 py-1.5 text-sm text-stone-900 hover:bg-white/60 hover:text-stone-900 rounded-full transition-all duration-200"
      >
        Toate Produsele
      </button>
      {categories.length > 0 && (
        <>
          <div className="h-px bg-stone-300/30 my-1.5"></div>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryClick(category.name)}
              className="w-full text-left px-3 py-1.5 text-sm text-stone-700 hover:bg-white/60 hover:text-stone-900 rounded-full transition-all duration-200"
            >
              {category.name}
            </button>
          ))}
        </>
      )}
    </div>
  );
};

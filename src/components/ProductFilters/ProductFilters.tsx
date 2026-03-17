import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Category } from '../../types/category.types';
import { FilterSection } from './FilterSection';
import { CategoryFilter } from './CategoryFilter';
import { PriceFilter } from './PriceFilter';

interface ProductFiltersProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryChange: (categoryName: string) => void;
  productCounts: Record<string, number>;
  minPrice: number;
  maxPrice: number;
  selectedMinPrice: number;
  selectedMaxPrice: number;
  onPriceChange: (min: number, max: number) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  categories,
  selectedCategories,
  onCategoryChange,
  productCounts,
  minPrice,
  maxPrice,
  selectedMinPrice,
  selectedMaxPrice,
  onPriceChange,
  isOpen = true,
  onClose,
  isMobile = false,
}) => {
  const filterContent = (
    <div className="bg-white rounded-2xl shadow-lg border border-stone-200">
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="font-medium text-stone-900 uppercase tracking-wide text-sm">
            Filtrează & Sortează
            {(selectedCategories.length > 0 || selectedMinPrice > minPrice || selectedMaxPrice < maxPrice) && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-amber-500 text-white rounded-full">
                {selectedCategories.length + (selectedMinPrice > minPrice || selectedMaxPrice < maxPrice ? 1 : 0)}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-stone-600" />
          </button>
        </div>
      )}

      <div className="p-4">
        <FilterSection title="Categorie" defaultOpen={true}>
          <CategoryFilter
            categories={categories}
            selectedCategories={selectedCategories}
            onCategoryChange={onCategoryChange}
            productCounts={productCounts}
          />
        </FilterSection>

        <FilterSection title="Preț (RON)" defaultOpen={true}>
          <PriceFilter
            minPrice={minPrice}
            maxPrice={maxPrice}
            selectedMin={selectedMinPrice}
            selectedMax={selectedMaxPrice}
            onPriceChange={onPriceChange}
          />
        </FilterSection>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />
        )}
        <div
          className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {filterContent}
        </div>
      </>
    );
  }

  return <div className="sticky top-20">{filterContent}</div>;
};

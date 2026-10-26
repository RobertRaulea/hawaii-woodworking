import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { Category } from '../../types/category.types';
import { Button } from '@/components/ui/button';
import {
 Sheet,
 SheetClose,
 SheetContent,
 SheetDescription,
 SheetTitle,
} from '@/components/ui/sheet';
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
 const { t } = useTranslation();

 const filterContent = (
 <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-lg border border-stone-200 dark:border-stone-800 ">
 {isMobile && (
 <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 ">
 <SheetTitle className="font-medium text-stone-900 dark:text-stone-50 uppercase tracking-wide text-sm">
 {t('filters.title')}
 {(selectedCategories.length > 0 || selectedMinPrice > minPrice || selectedMaxPrice < maxPrice) && (
 <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-amber-500 text-white rounded-full">
 {selectedCategories.length + (selectedMinPrice > minPrice || selectedMaxPrice < maxPrice ? 1 : 0)}
 </span>
 )}
 </SheetTitle>
 <SheetClose asChild>
 <Button
 variant="ghost"
 className="h-auto w-auto rounded-full p-1 hover:bg-stone-100 dark:hover:bg-stone-800 [&_svg]:size-6"
 aria-label={t('filters.close')}
 >
 <X className="h-6 w-6 text-stone-600 dark:text-stone-300 " />
 </Button>
 </SheetClose>
 </div>
 )}
 {isMobile && (
 <SheetDescription className="sr-only">
 {t('filters.title')}
 </SheetDescription>
 )}

 <div className="p-4">
 <FilterSection title={t('filters.category')} defaultOpen={true}>
 <CategoryFilter
 categories={categories}
 selectedCategories={selectedCategories}
 onCategoryChange={onCategoryChange}
 productCounts={productCounts}
 />
 </FilterSection>

 <FilterSection title={t('filters.price')} defaultOpen={true}>
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
 <Sheet
 open={isOpen}
 onOpenChange={(open) => {
 if (!open) onClose?.();
 }}
 >
 <SheetContent
 side="left"
 hideClose
 className="w-80 max-w-[85vw] border-stone-200 dark:border-stone-800 p-0"
 >
 {filterContent}
 </SheetContent>
 </Sheet>
 );
 }

 return <div className="sticky top-20">{filterContent}</div>;
};

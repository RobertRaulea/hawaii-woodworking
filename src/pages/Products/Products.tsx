import type React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Filter } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import { OptionSelect } from '../../components/OptionSelect';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useTranslatedProducts } from '../../hooks/useTranslatedProducts';
import { useTranslatedCategories } from '../../hooks/useTranslatedCategories';
import type { Product } from '../../types/product.types';
import { SEO } from '../../components/SEO/SEO';
import { ProductCard } from '../../components/ProductCard';
import { ProductFilters } from '../../components/ProductFilters';
import { SITE_URL } from '../../constants/site.constants';

type SortOption = 'price-asc' | 'price-desc' | 'name-asc';

interface ProductsProps {
 embedded?: boolean;
}

export const Products: React.FC<ProductsProps> = ({ embedded = false }) => {
 const { t } = useTranslation();
 const pageTitle = t('seo.productsTitle');
 const pageDescription = t('seo.productsDescription');
 const pageKeywords = [
 'produse lemn românia',
 'magazin online cadouri lemn',
 'decorațiuni handmade lemn',
 'mobilier lemn masiv',
 'artizanat românesc lemn'
 ];

 const [searchParams, setSearchParams] = useSearchParams();
 const { products: rawProducts, loading, error } = useProducts();
 const { categories: rawCategories } = useCategories();
 const products = useTranslatedProducts(rawProducts);
 const categories = useTranslatedCategories(rawCategories);

 const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
 const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });
 const [sortBy, setSortBy] = useState<SortOption>('price-asc');
 const [isFilterOpen, setIsFilterOpen] = useState(false);
 const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);

 const { minPrice, maxPrice } = useMemo(() => {
 if (!products.length) return { minPrice: 0, maxPrice: 10000 };
 const prices = products.map(p => p.price);
 return {
 minPrice: Math.floor(Math.min(...prices)),
 maxPrice: Math.ceil(Math.max(...prices)),
 };
 }, [products]);

 useEffect(() => {
 const categoriesParam = searchParams.get('categories');
 const minPriceParam = searchParams.get('minPrice');
 const maxPriceParam = searchParams.get('maxPrice');
 const sortParam = searchParams.get('sort');

 const parsePrice = (value: string | null, fallback: number): number => {
 if (value === null || !/^[+-]?\d+$/.test(value)) return fallback;
 const parsed = Number(value);
 if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
 return Math.min(maxPrice, Math.max(minPrice, parsed));
 };
 const min = parsePrice(minPriceParam, minPrice);
 const max = parsePrice(maxPriceParam, maxPrice);

 setSelectedCategories(categoriesParam ? categoriesParam.split(',') : []);
 setPriceRange({ min: Math.min(min, max), max: Math.max(min, max) });
 setSortBy(
 sortParam === 'price-desc' || sortParam === 'name-asc' ? sortParam : 'price-asc'
 );
 }, [searchParams, minPrice, maxPrice]);

 const updateUrlParams = (
 categories: string[],
 min: number,
 max: number,
 sort: SortOption
 ) => {
 const params = new URLSearchParams();
 if (categories.length > 0) {
 params.set('categories', categories.join(','));
 }
 if (min > minPrice) {
 params.set('minPrice', min.toString());
 }
 if (max < maxPrice) {
 params.set('maxPrice', max.toString());
 }
 if (sort !== 'price-asc') {
 params.set('sort', sort);
 }
 setSearchParams(params);
 };

 const handleCategoryChange = (categoryName: string) => {
 const newCategories = selectedCategories.includes(categoryName)
 ? selectedCategories.filter(c => c !== categoryName)
 : [...selectedCategories, categoryName];
 setSelectedCategories(newCategories);
 updateUrlParams(newCategories, priceRange.min, priceRange.max, sortBy);
 };

 const handlePriceChange = (min: number, max: number) => {
 setPriceRange({ min, max });
 updateUrlParams(selectedCategories, min, max, sortBy);
 };

 const handleSortChange = (value: string) => {
 const newSort = value as SortOption;
 setSortBy(newSort);
 updateUrlParams(selectedCategories, priceRange.min, priceRange.max, newSort);
 };

 const productCounts = useMemo(() => {
 const counts: Record<string, number> = {};
 categories.forEach(category => {
 counts[category.name] = products.filter(p => p.category === category.name).length;
 });
 return counts;
 }, [categories, products]);

 const filteredAndSortedProducts = useMemo(() => {
 let filtered = products;

 if (selectedCategories.length > 0) {
 filtered = filtered.filter(p => p.category && selectedCategories.includes(p.category));
 }

 filtered = filtered.filter(p => p.price >= priceRange.min && p.price <= priceRange.max);

 const sorted = [...filtered];
 switch (sortBy) {
 case 'price-asc':
 sorted.sort((a, b) => a.price - b.price);
 break;
 case 'price-desc':
 sorted.sort((a, b) => b.price - a.price);
 break;
 case 'name-asc':
 sorted.sort((a, b) => a.name.localeCompare(b.name));
 break;
 }

 return sorted;
 }, [products, selectedCategories, priceRange, sortBy]);

 const pageUrl = `${SITE_URL}/products`;

 const dynamicSchema = useMemo(() => {
 const itemListElements = (!loading && filteredAndSortedProducts && filteredAndSortedProducts.length > 0)
 ? filteredAndSortedProducts.map((product: Product, index: number) => ({
 '@type': 'ListItem',
 position: index + 1,
 name: product.name,
 url: `${SITE_URL}/product/${product.id}`,
 }))
 : [];

 return {
 '@context': 'https://schema.org',
 '@type': 'WebPage',
 name: pageTitle,
 description: pageDescription,
 url: pageUrl,
 mainEntity: {
 '@type': 'ItemList',
 name: 'Listă Produse Hawaii Woodworking',
 description: 'Descoperiți toate produsele din lemn lucrate manual, disponibile în magazinul nostru online.',
 itemListElement: itemListElements,
 }
 };
 }, [filteredAndSortedProducts, loading, pageTitle, pageDescription, pageUrl]);

 const activeFilterCount = selectedCategories.length + 
 (priceRange.min > minPrice || priceRange.max < maxPrice ? 1 : 0);

 return (
 <>
 {!embedded && (
 <SEO
 title={pageTitle}
 description={pageDescription}
 keywords={pageKeywords}
 schema={dynamicSchema}
 canonicalPath="/products"
 />
 )}
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
 {loading && (
 <div className="flex items-center justify-center py-20">
 <Spinner className="size-6 text-amber-600" />
 </div>
 )}
 {error && (
 <Alert variant="destructive" className="mb-4">
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 )}
 
 {!loading && (
 <>
 <div className="mb-6 lg:mb-8">
 {embedded ? (
 <h2 className="font-serif text-2xl lg:text-4xl font-medium text-foreground mb-4">
 {t('nav.products')}
 </h2>
 ) : (
 <h1 className="font-serif text-2xl lg:text-4xl font-medium text-foreground mb-4">
 {t('nav.products')}
 </h1>
 )}
 
 <div className="flex items-center justify-between gap-3">
 <Button
 variant="outline"
 onClick={() => setIsFilterOpen(true)}
 className="lg:hidden h-auto items-center gap-2 rounded-full border-stone-300 dark:border-stone-700 bg-card px-4 py-2 hover:bg-stone-50 dark:hover:bg-stone-800 [&_svg]:size-5"
 >
 <Filter className="size-5 text-stone-700 dark:text-stone-300 " />
 <span className="text-sm font-medium text-stone-700 dark:text-stone-300 ">{t('common.filter')}</span>
 {activeFilterCount > 0 && (
 <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-amber-500 text-white rounded-full">
 {activeFilterCount}
 </span>
 )}
 </Button>

 <Button
 variant="outline"
 onClick={() => setIsDesktopFilterOpen(prev => !prev)}
 className="hidden h-auto items-center gap-2 rounded-full border-stone-300 dark:border-stone-700 bg-card px-4 py-2 hover:bg-stone-50 dark:hover:bg-stone-800 lg:flex [&_svg]:size-5"
 aria-label={isDesktopFilterOpen ? 'Hide filters' : 'Show filters'}
 >
 <Filter className="size-5 text-stone-700 dark:text-stone-300 " />
 <span className="text-sm font-medium text-stone-700 dark:text-stone-300 ">
 {isDesktopFilterOpen ? t('filters.hide') : t('filters.show')}
 </span>
 {activeFilterCount > 0 && (
 <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-amber-500 text-white rounded-full">
 {activeFilterCount}
 </span>
 )}
 </Button>
 
 <div className="flex items-center gap-3 ml-auto">
 <Label htmlFor="sort" className="text-sm font-normal leading-5 text-stone-600 dark:text-stone-300 hidden sm:block">
 {t('filters.sortBy')}:
 </Label>
 <OptionSelect
 id="sort"
 value={sortBy}
 onValueChange={handleSortChange}
 className="rounded-full px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
 options={[
 { value: 'price-asc', label: t('filters.priceAsc') },
 { value: 'price-desc', label: t('filters.priceDesc') },
 { value: 'name-asc', label: t('filters.nameAsc') },
 ]}
 />
 </div>
 </div>
 </div>

 <div className="lg:flex lg:gap-8">
 <aside
 className={`hidden lg:block transition-all duration-300 ease-in-out ${
 isDesktopFilterOpen
 ? 'w-[280px] opacity-100'
 : 'w-0 opacity-0 pointer-events-none overflow-hidden'
 }`}
 >
 <div className="w-[280px]">
 <ProductFilters
 categories={categories}
 selectedCategories={selectedCategories}
 onCategoryChange={handleCategoryChange}
 productCounts={productCounts}
 minPrice={minPrice}
 maxPrice={maxPrice}
 selectedMinPrice={priceRange.min}
 selectedMaxPrice={priceRange.max}
 onPriceChange={handlePriceChange}
 />
 </div>
 </aside>

 <ProductFilters
 categories={categories}
 selectedCategories={selectedCategories}
 onCategoryChange={handleCategoryChange}
 productCounts={productCounts}
 minPrice={minPrice}
 maxPrice={maxPrice}
 selectedMinPrice={priceRange.min}
 selectedMaxPrice={priceRange.max}
 onPriceChange={handlePriceChange}
 isOpen={isFilterOpen}
 onClose={() => setIsFilterOpen(false)}
 isMobile={true}
 />

 <main>
 {filteredAndSortedProducts.length === 0 ? (
 <div className="text-center py-12">
 <p className="text-stone-600 dark:text-stone-300 ">{t('product.noProducts')}</p>
 </div>
 ) : (
 <>
 <div className="mb-4 text-sm text-stone-600 dark:text-stone-300 ">
 {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? t('product.details') : t('nav.products').toLowerCase()}
 </div>
 <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 lg:gap-8">
 {filteredAndSortedProducts.map((product: Product) => (
 <ProductCard
 key={product.id}
 id={product.id}
 name={product.name}
 price={product.price}
 imageUrls={product.imageUrls ?? null}
 stock={product.stock}
 lowStockThreshold={product.lowStockThreshold}
 trackStock={product.trackStock}
 />
 ))}
 </div>
 </>
 )}
 </main>
 </div>
 </>
 )}
 </div>
 </>
 );
};

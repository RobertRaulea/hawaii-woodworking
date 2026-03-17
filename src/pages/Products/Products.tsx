import type React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FunnelIcon } from '@heroicons/react/24/outline';
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

export const Products: React.FC = () => {
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
    const sortParam = searchParams.get('sort') as SortOption;

    if (categoriesParam) {
      setSelectedCategories(categoriesParam.split(','));
    }
    if (minPriceParam) {
      setPriceRange(prev => ({ ...prev, min: parseInt(minPriceParam) }));
    } else {
      setPriceRange(prev => ({ ...prev, min: minPrice }));
    }
    if (maxPriceParam) {
      setPriceRange(prev => ({ ...prev, max: parseInt(maxPriceParam) }));
    } else {
      setPriceRange(prev => ({ ...prev, max: maxPrice }));
    }
    if (sortParam && ['price-asc', 'price-desc', 'name-asc'].includes(sortParam)) {
      setSortBy(sortParam);
    }
  }, [searchParams, minPrice, maxPrice]);

  useEffect(() => {
    if (minPrice && maxPrice && priceRange.min === 0 && priceRange.max === 10000) {
      setPriceRange({ min: minPrice, max: maxPrice });
    }
  }, [minPrice, maxPrice, priceRange.min, priceRange.max]);

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

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as SortOption;
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

  const pageUrl = useMemo(() => 
    typeof window !== 'undefined' ? window.location.href : `${SITE_URL}/products`
  , []);

  const dynamicSchema = useMemo(() => {
    const itemListElements = (!loading && filteredAndSortedProducts && filteredAndSortedProducts.length > 0)
      ? filteredAndSortedProducts.map((product: Product, index: number) => {
          const imageUrl = product.imageUrls?.[0] ?? `${SITE_URL}/images/placeholder-product.jpg`;

          return {
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Product',
              name: product.name,
              url: `${SITE_URL}/product/${product.id}`,
              image: imageUrl,
              description: product.description || product.name, 
              offers: {
                '@type': 'Offer',
                priceCurrency: 'RON',
                price: product.price.toFixed(2),
                availability: 'https://schema.org/InStock', 
                url: `${SITE_URL}/product/${product.id}`
              },
              brand: {
                '@type': 'Brand',
                name: 'Hawaii Woodworking'
              }
            }
          };
        })
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
      <SEO 
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
        schema={dynamicSchema}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-stone-300 border-t-amber-600 rounded-full animate-spin"></div>
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        {!loading && (
          <>
            <div className="mb-6 lg:mb-8">
              <h1 className="font-serif text-2xl lg:text-4xl font-medium text-stone-900 mb-4">
                {t('nav.products')}
              </h1>
              
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 rounded-full hover:bg-stone-50 transition-colors"
                >
                  <FunnelIcon className="h-5 w-5 text-stone-700" />
                  <span className="text-sm font-medium text-stone-700">{t('common.filter')}</span>
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-amber-500 text-white rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                
                <div className="flex items-center gap-3 ml-auto">
                  <label htmlFor="sort" className="text-sm text-stone-600 hidden sm:block">
                    {t('filters.sortBy')}:
                  </label>
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={handleSortChange}
                    className="px-3 py-2 text-sm border border-stone-300 rounded-full bg-white hover:bg-stone-50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  >
                    <option value="price-asc">{t('filters.priceAsc')}</option>
                    <option value="price-desc">{t('filters.priceDesc')}</option>
                    <option value="name-asc">{t('filters.nameAsc')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
              <aside className="hidden lg:block">
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
                    <p className="text-stone-600">{t('product.noProducts')}</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 text-sm text-stone-600">
                      {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? t('product.details') : t('nav.products').toLowerCase()}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                      {filteredAndSortedProducts.map((product: Product) => (
                        <ProductCard
                          key={product.id}
                          id={product.id}
                          name={product.name}
                          price={product.price}
                          imageUrls={product.imageUrls ?? null}
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

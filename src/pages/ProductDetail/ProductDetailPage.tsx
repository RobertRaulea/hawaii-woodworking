import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Hammer,
  Minus,
  PackageSearch,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../hooks/useProducts';
import { useTranslatedProduct, useTranslatedProducts } from '../../hooks/useTranslatedProducts';
import { SEO } from '../../components/SEO/SEO';
import { ProductGallery } from '../../components/ProductGallery';
import { ProductCard } from '../../components/ProductCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { SITE_URL } from '../../constants/site.constants';

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { t } = useTranslation();
  const { addItem, state } = useCart();

  const rawProduct = useQuery(
    api.products.getById,
    productId ? { id: productId as Id<'products'> } : 'skip'
  );
  const product = useTranslatedProduct(rawProduct);
  const loading = rawProduct === undefined;

  const { products: allProducts } = useProducts();
  const translatedProducts = useTranslatedProducts(allProducts);

  const [quantity, setQuantity] = useState(1);
  useEffect(() => setQuantity(1), [productId]);

  const productImages = useMemo(() => {
    if (product?.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls;
    }
    return ['https://placehold.co/800x800?text=Product+Image'];
  }, [product?.imageUrls]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const others = translatedProducts.filter(p => p.id !== product._id);
    const sameCategory = product.category
      ? others.filter(p => p.category === product.category)
      : [];
    const rest = others.filter(p => !sameCategory.includes(p));
    return [...sameCategory, ...rest].slice(0, 8);
  }, [translatedProducts, product]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <Skeleton className="mb-6 h-4 w-72 lg:mb-8" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
          <Skeleton className="aspect-[4/5] w-full rounded-xl sm:aspect-square" />
          <div className="space-y-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <PackageSearch className="h-12 w-12 text-stone-300 dark:text-stone-600" strokeWidth={1.5} />
        <h1 className="mt-5 font-serif text-2xl font-medium text-stone-900 dark:text-stone-50">
          {t('product.notFound')}
        </h1>
        <p className="mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
          {t('product.notFoundDescription')}
        </p>
        <Button asChild variant="secondary" className="mt-7">
          <Link to="/products">{t('product.browseProducts')}</Link>
        </Button>
      </div>
    );
  }

  const currentStock = product.availableStock ?? 0;
  const threshold = product.lowStockThreshold ?? 5;
  const isTrackingStock = product.trackStock ?? true;

  // Get quantity in cart for this product
  const quantityInCart = state.items.find(item => item.id === product._id)?.quantity ?? 0;
  const remainingStock = currentStock - quantityInCart;
  const displayStock = Math.max(0, remainingStock);
  const isOutOfStock = isTrackingStock && displayStock === 0;
  const isLowStock = isTrackingStock && displayStock > 0 && displayStock <= threshold;
  const isStockLimitReached = isTrackingStock && quantityInCart >= currentStock;
  const maxQuantity = isTrackingStock ? Math.max(1, displayStock) : 99;
  const canBuy = !isOutOfStock && !isStockLimitReached;

  const clampQuantity = (value: number) => Math.min(Math.max(1, value), maxQuantity);

  const handleAddToCart = () => {
    const image = product.imageUrls?.[0] ?? null;
    addItem(
      {
        id: product._id,
        name: product.name,
        price: product.price,
        image: image || 'https://placehold.co/100x100?text=No+Image',
      },
      currentStock,
      isTrackingStock,
      quantity
    );
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t('product.linkCopied'), { duration: 2500 });
    } catch {
      toast.error(t('common.error'), { duration: 2500 });
    }
  };

  // Fallback for description if not available
  const description =
    product.description ||
    `Details for ${product.name}. Discover the quality and craftsmanship of our handmade ${product.category || 'item'}.`;

  // SEO Meta Tags and Schema
  const pageTitle = `${product.name} - Hawaii Woodworking`;
  const pageDescription = product.description
    ? product.description.substring(0, 160)
    : `Descoperă ${product.name}, un articol din lemn lucrat manual, perfect pentru cadouri sau decorațiuni. Calitate și design românesc de la Hawaii Woodworking.`;
  const pageKeywords = [
    product.name,
    product.category || 'produs lemn',
    'cadouri lemn personalizate',
    'artizanat românesc',
    'handmade România',
    'Hawaii Woodworking',
    'platouase',
    'hawaii sibiu',
  ];

  const availabilitySchema = isOutOfStock
    ? 'https://schema.org/OutOfStock'
    : isLowStock
      ? 'https://schema.org/LimitedAvailability'
      : 'https://schema.org/InStock';

  const pageUrl = `${SITE_URL}/product/${product._id}`;
  const productSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: product.name,
        description: product.description || pageDescription,
        image: productImages,
        sku: product.sku || product._id,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'RON',
          price: product.price.toFixed(2),
          availability: availabilitySchema,
          url: pageUrl,
        },
        brand: {
          '@type': 'Brand',
          name: 'Hawaii Woodworking',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t('nav.home'), item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: t('nav.products'), item: `${SITE_URL}/products` },
          { '@type': 'ListItem', position: 3, name: product.name, item: pageUrl },
        ],
      },
    ],
  };

  const benefits = [
    { icon: Hammer, label: t('product.benefitHandcrafted') },
    { icon: Truck, label: t('product.benefitShipping') },
    { icon: ShieldCheck, label: t('product.benefitSecure') },
    { icon: RotateCcw, label: t('product.benefitReturns') },
  ];

  return (
    <>
      <SEO
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
        image={productImages[0]}
        type="product"
        schema={productSchema}
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 lg:mb-8">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
            <li>
              <Link
                to="/"
                className="transition-colors hover:text-amber-700 dark:hover:text-amber-400"
              >
                {t('nav.home')}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600" />
            </li>
            <li>
              <Link
                to="/products"
                className="transition-colors hover:text-amber-700 dark:hover:text-amber-400"
              >
                {t('nav.products')}
              </Link>
            </li>
            {product.category && (
              <>
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600" />
                </li>
                <li>
                  <Link
                    to={`/products?categories=${encodeURIComponent(product.category)}`}
                    className="transition-colors hover:text-amber-700 dark:hover:text-amber-400"
                  >
                    {product.category}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600" />
            </li>
            <li
              aria-current="page"
              className="max-w-[12rem] truncate font-medium text-stone-900 dark:text-stone-100 sm:max-w-xs"
            >
              {product.name}
            </li>
          </ol>
        </nav>

        {/* Gallery + buy panel */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={productImages} alt={product.name} />

          <div className="flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                {product.category || 'Produs din lemn'}
              </p>
              <Button
                variant="ghost"
                onClick={handleShare}
                className="h-9 w-9 shrink-0 rounded-full p-0 text-stone-400 hover:text-amber-700 dark:hover:text-amber-400"
                aria-label={t('product.share')}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            <h1 className="mt-2 font-serif text-2xl font-medium leading-tight text-stone-900 dark:text-stone-50 sm:text-3xl">
              {product.name}
            </h1>

            {isTrackingStock && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                {isOutOfStock ? (
                  <Badge className="gap-2 rounded-full border-0 bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                    {t('product.outOfStock')}
                  </Badge>
                ) : isLowStock ? (
                  <Badge className="gap-2 rounded-full border-0 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-900/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                    {t('product.onlyXLeft', { count: displayStock })}
                  </Badge>
                ) : (
                  <Badge className="gap-2 rounded-full border-0 bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400 dark:hover:bg-green-900/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    {t('product.xInStock', { count: displayStock })}
                  </Badge>
                )}
              </div>
            )}

            {/* Buy box */}
            <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
              <p className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                {product.price.toFixed(2)}{' '}
                <span className="text-lg font-normal text-stone-500 dark:text-stone-400">RON</span>
              </p>

              {/* Quantity + add to cart */}
              <div className="mt-4 flex items-stretch gap-3">
              <div className="flex items-center rounded-md border border-stone-300 dark:border-stone-700">
                <button
                  type="button"
                  onClick={() => setQuantity(q => clampQuantity(q - 1))}
                  disabled={!canBuy || quantity <= 1}
                  className="flex h-full w-10 items-center justify-center rounded-l-md text-stone-600 transition-colors hover:bg-stone-100 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-stone-300 dark:hover:bg-stone-800"
                  aria-label={t('product.decreaseQuantity')}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span
                  className="w-10 text-center text-sm font-semibold text-stone-900 dark:text-stone-50"
                  aria-label={t('product.quantityLabel')}
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => clampQuantity(q + 1))}
                  disabled={!canBuy || quantity >= maxQuantity}
                  className="flex h-full w-10 items-center justify-center rounded-r-md text-stone-600 transition-colors hover:bg-stone-100 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-stone-300 dark:hover:bg-stone-800"
                  aria-label={t('product.increaseQuantity')}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                variant="secondary"
                size="2xl"
                onClick={handleAddToCart}
                disabled={!canBuy}
                className="flex-1 rounded-md"
              >
                <ShoppingCart className="h-4 w-4" />
                {isOutOfStock
                  ? t('product.outOfStock')
                  : isStockLimitReached
                    ? t('product.maxInCart')
                    : t('product.addToCart')}
              </Button>
              </div>

              <Separator className="my-5" />

              {/* Product details */}
              <div>
                <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                  {t('product.productDetails')}
                </h2>
                <dl className="mt-4 divide-y divide-stone-200 text-sm dark:divide-stone-800">
                  {product.sku && (
                    <div className="flex justify-between gap-4 py-2.5 first:pt-0">
                      <dt className="text-stone-500 dark:text-stone-400">{t('product.sku')}</dt>
                      <dd className="font-medium text-stone-900 dark:text-stone-100">
                        {product.sku}
                      </dd>
                    </div>
                  )}
                  {product.category && (
                    <div className="flex justify-between gap-4 py-2.5 first:pt-0">
                      <dt className="text-stone-500 dark:text-stone-400">{t('product.category')}</dt>
                      <dd className="font-medium text-stone-900 dark:text-stone-100">
                        <Link
                          to={`/products?categories=${encodeURIComponent(product.category)}`}
                          className="transition-colors hover:text-amber-700 dark:hover:text-amber-400"
                        >
                          {product.category}
                        </Link>
                      </dd>
                    </div>
                  )}
                </dl>
                <p className="mt-4 flex gap-2.5 text-sm italic leading-relaxed text-stone-500 dark:text-stone-400">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  {t('product.uniqueNote')}
                </p>
              </div>

              <Separator className="my-5" />

              {/* Benefits */}
              <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
                {benefits.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2.5 text-xs font-medium text-stone-600 dark:text-stone-300"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Shipping accordion */}
            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="shipping">
                <AccordionTrigger>{t('product.shippingReturns')}</AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  <p>{t('product.shippingDetails')}</p>
                  <p>{t('product.returnsDetails')}</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Description */}
        <section className="mt-14 lg:mt-20">
          <div className="max-w-3xl">
            <h2 className="font-serif text-2xl font-medium text-stone-900 dark:text-stone-50 lg:text-3xl">
              {t('product.descriptionTitle')}
            </h2>
            <div className="mt-5 whitespace-pre-line text-base leading-relaxed text-stone-600 dark:text-stone-300">
              {description}
            </div>
          </div>
        </section>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section className="mt-14 lg:mt-20">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="font-serif text-2xl font-medium text-stone-900 dark:text-stone-50 lg:text-3xl">
                {t('product.relatedProducts')}
              </h2>
              <Link
                to="/products"
                className="shrink-0 text-sm font-medium text-amber-700 transition-colors hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              >
                {t('product.browseProducts')} →
              </Link>
            </div>
            {/* Mobile/tablet: swipeable strip, 2 cards visible at a time */}
            <div className="relative lg:hidden">
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden">
                {relatedProducts.map(related => (
                  <div key={related.id} className="w-[calc(50%-6px)] shrink-0 snap-start">
                    <ProductCard
                      id={related.id}
                      name={related.name}
                      price={related.price}
                      imageUrls={related.imageUrls ?? null}
                      stock={related.stock}
                      lowStockThreshold={related.lowStockThreshold}
                      trackStock={related.trackStock}
                    />
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent dark:from-stone-950" />
            </div>

            {/* Desktop: 4-column grid */}
            <div className="hidden gap-6 lg:grid lg:grid-cols-4">
              {relatedProducts.slice(0, 4).map(related => (
                <ProductCard
                  key={related.id}
                  id={related.id}
                  name={related.name}
                  price={related.price}
                  imageUrls={related.imageUrls ?? null}
                  stock={related.stock}
                  lowStockThreshold={related.lowStockThreshold}
                  trackStock={related.trackStock}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
};

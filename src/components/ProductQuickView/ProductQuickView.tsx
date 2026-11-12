import type React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Minus, PackageSearch, Plus, ShoppingCart, X } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useCart } from '../../context/CartContext';
import { useAdminQuery } from '../../hooks/useAdminQuery';
import { useTranslatedProduct } from '../../hooks/useTranslatedProducts';
import { ProductGallery } from '../ProductGallery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { flyToCart } from '../../utils/flyToCart.utils';

interface ProductQuickViewProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  productId,
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const { addItem, state } = useCart();

  const { data: rawProduct } = useAdminQuery(
    api.products.getById,
    open && productId ? { id: productId as Id<'products'> } : 'skip'
  );
  const product = useTranslatedProduct(rawProduct);
  const loading = rawProduct === undefined;

  const [quantity, setQuantity] = useState(1);
  useEffect(() => setQuantity(1), [productId, open]);

  const currentStock = product?.availableStock ?? 0;
  const threshold = product?.lowStockThreshold ?? 5;
  const isTrackingStock = product?.trackStock ?? true;

  const quantityInCart = state.items.find(item => item.id === product?._id)?.quantity ?? 0;
  const displayStock = Math.max(0, currentStock - quantityInCart);
  const isOutOfStock = isTrackingStock && displayStock === 0;
  const isLowStock = isTrackingStock && displayStock > 0 && displayStock <= threshold;
  const isStockLimitReached = isTrackingStock && quantityInCart >= currentStock;
  const maxQuantity = isTrackingStock ? Math.max(1, displayStock) : 99;
  const canBuy = !isOutOfStock && !isStockLimitReached;

  const clampQuantity = (value: number) => Math.min(Math.max(1, value), maxQuantity);

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!product) return;
    const button = event.currentTarget;
    const image = product.imageUrls?.[0] || 'https://placehold.co/100x100?text=No+Image';
    const added = addItem(
      {
        id: product._id,
        name: product.name,
        price: product.price,
        image,
      },
      currentStock,
      isTrackingStock,
      quantity
    );
    if (added) {
      flyToCart(button, image);
      onOpenChange(false);
    }
  };

  const images =
    product?.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : ['https://placehold.co/800x800?text=Product+Image'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="max-w-4xl gap-6 p-4 sm:p-6"
      >
        <DialogTitle className="sr-only">
          {product?.name ?? t('product.viewDetails')}
        </DialogTitle>
        <DialogClose
          aria-label={t('common.close')}
          className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-50"
        >
          <X className="size-5" />
        </DialogClose>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2" aria-busy="true">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : !product ? (
          <div className="flex flex-col items-center py-14 text-center">
            <PackageSearch className="size-10 text-stone-300 dark:text-stone-600" strokeWidth={1.5} />
            <p className="mt-4 font-medium text-foreground">{t('product.notFound')}</p>
            <Button asChild variant="secondary" className="mt-6">
              <Link to="/products" onClick={() => onOpenChange(false)}>
                {t('product.browseProducts')}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <ProductGallery images={images} alt={product.name} />

            <div className="flex min-w-0 flex-col">
              <p className="pr-10 text-xs font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                {product.category || 'Produs din lemn'}
              </p>
              <h2 className="mt-2 font-serif text-2xl font-medium leading-tight text-foreground">
                {product.name}
              </h2>

              {isTrackingStock && (
                <div className="mt-3">
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

              <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                {product.price.toFixed(2)}{' '}
                <span className="text-base font-normal text-muted-foreground">RON</span>
              </p>

              <div className="mt-4 flex items-stretch gap-3">
                <div className="flex items-center rounded-md border border-stone-300 dark:border-stone-700">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setQuantity(q => clampQuantity(q - 1))}
                    disabled={!canBuy || quantity <= 1}
                    className="flex h-full min-h-0 w-10 items-center justify-center rounded-l-md rounded-r-none p-0 text-stone-600 transition-colors duration-150 hover:bg-muted hover:text-stone-600 focus-visible:outline-none focus-visible:ring-amber-500 active:scale-100 dark:text-stone-300 dark:hover:text-stone-300"
                    aria-label={t('product.decreaseQuantity')}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span
                    className="w-10 text-center text-sm font-semibold text-foreground"
                    aria-label={t('product.quantityLabel')}
                  >
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setQuantity(q => clampQuantity(q + 1))}
                    disabled={!canBuy || quantity >= maxQuantity}
                    className="flex h-full min-h-0 w-10 items-center justify-center rounded-r-md rounded-l-none p-0 text-stone-600 transition-colors duration-150 hover:bg-muted hover:text-stone-600 focus-visible:outline-none focus-visible:ring-amber-500 active:scale-100 dark:text-stone-300 dark:hover:text-stone-300"
                    aria-label={t('product.increaseQuantity')}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                <Button
                  variant="secondary"
                  size="2xl"
                  onClick={handleAddToCart}
                  disabled={!canBuy}
                  className="flex-1 rounded-md"
                >
                  <ShoppingCart className="size-4" />
                  {isOutOfStock
                    ? t('product.outOfStock')
                    : isStockLimitReached
                      ? t('product.maxInCart')
                      : t('product.addToCart')}
                </Button>
              </div>

              {product.description && (
                <p className="mt-5 line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  {product.description}
                </p>
              )}

              <Link
                to={`/product/${product._id}`}
                onClick={() => onOpenChange(false)}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 transition-colors hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              >
                {t('product.viewDetails')}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

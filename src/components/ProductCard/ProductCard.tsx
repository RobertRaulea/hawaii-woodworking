import type React from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../context/CartContext';
import { ImageCarousel } from '../ImageCarousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ProductCardProps {
 id: string;
 name: string;
 price: number;
 imageUrls?: string[] | null;
 stock?: number;
 lowStockThreshold?: number;
 trackStock?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ name, price, imageUrls, id, stock, lowStockThreshold, trackStock }) => {
 const { t } = useTranslation();
 const { addItem } = useCart();

 const currentStock = stock ?? 0;
 const threshold = lowStockThreshold ?? 5;
 const isTrackingStock = trackStock ?? true;
 const isOutOfStock = isTrackingStock && currentStock === 0;

 // Get current quantity in cart for this product
 const { state } = useCart();
 const quantityInCart = state.items.find(item => item.id === id)?.quantity ?? 0;
 const remainingStock = currentStock - quantityInCart;
 const isStockLimitReached = isTrackingStock && quantityInCart >= currentStock;
 const displayStock = Math.max(0, remainingStock);

 const displayImages = useMemo(() => {
 return imageUrls ?? [];
 }, [imageUrls]);

 const coverImage =
 displayImages.length > 0
 ? (displayImages.find(
 (img) => img.endsWith('_main.png') || img.endsWith('_main.jpg') || img.endsWith('_main.webp')
 ) ?? displayImages[0])
 : null;

 const initialIndex = useMemo(() => {
 if (displayImages.length === 0) return 0;
 const mainImageIdx = displayImages.findIndex(
 (img) => img.endsWith('_main.png') || img.endsWith('_main.jpg') || img.endsWith('_main.webp')
 );
 return mainImageIdx !== -1 ? mainImageIdx : 0;
 }, [displayImages]);

 return (
 <Card className="group overflow-hidden rounded-lg border-stone-200 dark:border-stone-800 py-0 shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-soft-lg">
 <Link to={`/product/${id}`} className="block">
 <div className="overflow-hidden">
 <ImageCarousel
 images={displayImages}
 alt={name}
 className="w-full h-44 sm:h-56 lg:h-72 object-cover transition-transform duration-500 group-hover:scale-105"
 initialIndex={initialIndex}
 />
 </div>
 <div className="p-3 pb-2 sm:p-5 sm:pb-3">
 {isTrackingStock && (
 <div className="mb-2">
 {isOutOfStock || displayStock === 0 ? (
 <Badge className="gap-1 rounded-full border-0 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">
 <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
 {t('product.outOfStock')}
 </Badge>
 ) : remainingStock <= threshold ? (
 <Badge className="gap-1 rounded-full border-0 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">
 <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
 {t('product.xInStock', { count: displayStock })}
 </Badge>
 ) : (
 <Badge className="gap-1 rounded-full border-0 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40">
 <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>
 {t('product.xInStock', { count: displayStock })}
 </Badge>
 )}
 </div>
 )}
 <h3 className="font-serif text-sm sm:text-lg font-medium text-stone-900 dark:text-stone-50 mb-1.5 truncate" title={name}>{name}</h3>
 <div className="flex items-center justify-between">
 <p className="text-amber-700 dark:text-amber-400 font-semibold text-sm sm:text-base tracking-wide">{price.toFixed(2)} RON</p>
 </div>
 </div>
 </Link>
 <div className="px-3 pb-3 sm:px-5 sm:pb-5">
 {isOutOfStock ? (
 <Button
 variant="outline"
 disabled
 className="h-auto w-full rounded-md border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-2 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm font-medium text-stone-400 dark:text-stone-500 "
 >
 {t('product.outOfStock')}
 </Button>
 ) : isStockLimitReached ? (
 <Button
 variant="outline"
 disabled
 className="h-auto w-full rounded-md border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-2 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm font-medium text-stone-400 dark:text-stone-500 "
 >
 {t('product.maxInCart')}
 </Button>
 ) : (
 <Button
 variant="outline"
 onClick={() =>
 addItem({
 id,
 name,
 price,
 image: coverImage || 'https://placehold.co/100x100?text=No+Image',
 }, currentStock, isTrackingStock)
 }
 className="h-auto w-full rounded-md border-stone-900 dark:border-stone-400 px-2 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm font-medium text-stone-900 dark:text-stone-50 transition-all duration-200 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-50 dark:hover:text-stone-900"
 >
 {t('product.addToCart')}
 </Button>
 )}
 </div>
 </Card>
 );
};

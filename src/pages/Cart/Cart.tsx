import type React from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ShoppingCart, Minus, Plus, Trash2, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CartItem } from '../../context/CartContext';
import { useCart } from '../../context/CartContext';
import {
  getAnalyticsStatus,
  subscribeAnalytics,
  trackAnalytics,
} from '../../utils/analytics.utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProductQuickView } from '../../components/ProductQuickView';

export const Cart: React.FC = () => {
 const { t } = useTranslation();
 const { state, removeItem, updateQuantity } = useCart();
 const navigate = useNavigate();
 const [searchParams, setSearchParams] = useSearchParams();
 const [quickViewId, setQuickViewId] = useState<string | null>(null);
 const isCanceled = searchParams.get('canceled') === 'true';
 const cartImageFallback = 'https://placehold.co/100x100?text=No+Image';

 const analyticsStatus = useSyncExternalStore(subscribeAnalytics, getAnalyticsStatus);
 const viewedEpochRef = useRef<number | null>(null);
 const canceledEpochRef = useRef<number | null>(null);

 useEffect(() => {
 if (analyticsStatus.ready && viewedEpochRef.current !== analyticsStatus.epoch) {
 viewedEpochRef.current = analyticsStatus.epoch;
 trackAnalytics('cart_viewed', {
 item_count: state.items.reduce((sum, item) => sum + item.quantity, 0),
 surface: 'storefront',
 });
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [analyticsStatus.epoch, analyticsStatus.ready]);

 useEffect(() => {
 // Stripe cancellation return marker only; it is not proof of a financial outcome.
 if (analyticsStatus.ready && isCanceled && canceledEpochRef.current !== analyticsStatus.epoch) {
 canceledEpochRef.current = analyticsStatus.epoch;
 trackAnalytics('checkout_returned_from_stripe', {
 return_reason: 'cancelled',
 surface: 'storefront',
 });
 }
 }, [analyticsStatus.epoch, analyticsStatus.ready, isCanceled]);

 const dismissCanceled = () => {
 searchParams.delete('canceled');
 setSearchParams(searchParams, { replace: true });
 };

 const calculateTotal = () => {
 return state.items.reduce(
 (total: number, item: CartItem) => total + item.price * item.quantity,
 0
 );
 };

 const formatPrice = (price: number): string => {
 return `${price.toFixed(2)} RON`;
 };

 const getCartImageSrc = (image: string): string => {
 if (!image) {
 return cartImageFallback;
 }

 if (
 image.startsWith('http://') ||
 image.startsWith('https://') ||
 image.startsWith('data:') ||
 image.startsWith('blob:')
 ) {
 return image;
 }

 return cartImageFallback;
 };

 if (state.items.length === 0) {
 return (
 <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
 <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
 <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
 <ShoppingCart className="w-7 h-7 text-stone-400 dark:text-stone-500 " />
 </div>
 <h2 className="font-serif text-2xl font-medium text-foreground mb-2">{t('cart.empty')}</h2>
 <p className="text-muted-foreground text-sm mb-8">{t('cart.emptyDescription')}</p>
 <Button
 variant="outline"
 className="h-auto rounded-md border-stone-900 dark:border-stone-400 px-8 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-50 dark:hover:text-stone-900"
 onClick={() => window.history.back()}
 >
 {t('cart.continueShopping')}
 </Button>
 </div>
 </div>
 );
 }

 return (
 <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
 {isCanceled && (
 <Alert className="mb-8 flex items-center justify-between border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 [&>svg]:text-amber-800 dark:[&>svg]:text-amber-300">
 <AlertDescription className="text-sm text-amber-800 dark:text-amber-300 ">
 {t('cart.paymentCanceled')}
 </AlertDescription>
 <Button
 variant="ghost"
 onClick={dismissCanceled}
 aria-label={t('common.close')}
 className="h-auto w-auto shrink-0 p-0 text-amber-800 dark:text-amber-300 hover:bg-transparent hover:text-amber-600 dark:hover:text-amber-400 [&_svg]:size-4"
 >
 <XCircle className="w-4 h-4" />
 </Button>
 </Alert>
 )}
 <h1 className="font-serif text-3xl lg:text-4xl font-medium text-foreground mb-10">{t('cart.title')}</h1>
 <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
 <div className="flex-grow">
 {state.items.map((item: CartItem) => (
 <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center gap-5 border-b border-border py-6 first:pt-0">
 <button
 type="button"
 onClick={() => setQuickViewId(item.id)}
 aria-label={`${t('product.viewDetails')}: ${item.name}`}
 className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
 >
 <img
 src={getCartImageSrc(item.image)}
 alt={item.name}
 className="w-20 h-20 object-cover rounded-md"
 />
 </button>
 <div className="flex-grow">
 <h3 className="font-medium text-foreground">
 <button
 type="button"
 onClick={() => setQuickViewId(item.id)}
 className="rounded-sm text-left transition-colors hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:text-amber-400"
 >
 {item.name}
 </button>
 </h3>
 <p className="text-muted-foreground text-sm mt-0.5">{formatPrice(item.price)}</p>
 </div>
 <div className="flex items-center gap-3">
 <Button
 variant="outline"
 onClick={() => updateQuantity(item.id, item.quantity - 1)}
 className="size-8 rounded-md border-border p-0 hover:border-stone-400 hover:bg-transparent [&_svg]:size-3.5"
 aria-label={`${t('cart.updateQuantity')}: ${item.name}`}
 >
 <Minus className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300 " />
 </Button>
 <span className="w-8 text-center text-sm font-medium text-foreground">{item.quantity}</span>
 <Button
 variant="outline"
 onClick={() => updateQuantity(item.id, item.quantity + 1)}
 disabled={(() => {
 const isTrackingStock = item.trackStock ?? true;
 if (!isTrackingStock) return false;
 const availableStock = item.stock ?? 0;
 return item.quantity >= availableStock;
 })()}
 className="size-8 rounded-md border-border p-0 hover:border-stone-400 hover:bg-transparent disabled:opacity-40 disabled:hover:border-stone-200 dark:disabled:hover:border-stone-800:border-stone-800 [&_svg]:size-3.5"
 aria-label={`${t('cart.updateQuantity')}: ${item.name}`}
 >
 <Plus className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300 " />
 </Button>
 </div>
 <div className="flex items-center gap-4">
 <p className="font-medium text-foreground text-sm">{formatPrice(item.price * item.quantity)}</p>
 <Button
 variant="ghost"
 onClick={() => removeItem(item.id)}
 aria-label={`${t('cart.remove')}: ${item.name}`}
 className="h-auto w-auto p-2 text-stone-400 dark:text-stone-500 hover:bg-transparent hover:text-red-500 [&_svg]:size-4"
 >
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 <div className="lg:w-80 flex-shrink-0">
 <Card className="sticky top-24 rounded-lg border-border p-6 shadow-none">
 <h2 className="font-serif text-lg font-medium text-foreground mb-5">{t('cart.orderSummary')}</h2>
 <div className="flex justify-between mb-6 text-sm">
 <span className="text-muted-foreground">{t('common.subtotal')}</span>
 <span className="font-medium text-foreground">{formatPrice(calculateTotal())}</span>
 </div>
 <div className="border-t border-border pt-4 mb-6">
 <div className="flex justify-between">
 <span className="font-medium text-foreground">{t('common.total')}</span>
 <span className="font-semibold text-foreground">{formatPrice(calculateTotal())}</span>
 </div>
 </div>
 <Button
 className="h-auto w-full rounded-md bg-stone-900 py-3 text-sm font-medium tracking-wide text-white transition-all duration-200 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
 onClick={() => navigate('/shipping')}
 >
 {t('cart.checkout')}
 </Button>
 </Card>
 </div>
 </div>
 <ProductQuickView
 productId={quickViewId}
 open={quickViewId !== null}
 onOpenChange={(open) => {
 if (!open) setQuickViewId(null);
 }}
 />
 </div>
 );
};

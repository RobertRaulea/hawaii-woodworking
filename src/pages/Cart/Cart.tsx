import type React from 'react';
import { ShoppingCart, Minus, Plus, Trash2, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CartItem } from '../../context/CartContext';
import { useCart } from '../../context/CartContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const Cart: React.FC = () => {
 const { t } = useTranslation();
 const { state, removeItem, updateQuantity } = useCart();
 const navigate = useNavigate();
 const [searchParams, setSearchParams] = useSearchParams();
 const isCanceled = searchParams.get('canceled') === 'true';
 const cartImageFallback = 'https://placehold.co/100x100?text=No+Image';

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
 <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-6">
 <ShoppingCart className="w-7 h-7 text-stone-400 dark:text-stone-500 " />
 </div>
 <h2 className="font-serif text-2xl font-medium text-stone-900 dark:text-stone-50 mb-2">{t('cart.empty')}</h2>
 <p className="text-stone-500 dark:text-stone-400 text-sm mb-8">{t('cart.emptyDescription')}</p>
 <Button
 variant="outline"
 className="h-auto rounded-md border-stone-900 dark:border-stone-400 px-8 py-2.5 text-sm font-medium text-stone-900 dark:text-stone-50 transition-all duration-200 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-50 dark:hover:text-stone-900"
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
 <h1 className="font-serif text-3xl lg:text-4xl font-medium text-stone-900 dark:text-stone-50 mb-10">{t('cart.title')}</h1>
 <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
 <div className="flex-grow">
 {state.items.map((item: CartItem) => (
 <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center gap-5 border-b border-stone-200 dark:border-stone-800 py-6 first:pt-0">
 <img
 src={getCartImageSrc(item.image)}
 alt={item.name}
 className="w-20 h-20 object-cover rounded-md"
 />
 <div className="flex-grow">
 <h3 className="font-medium text-stone-900 dark:text-stone-50 ">{item.name}</h3>
 <p className="text-stone-500 dark:text-stone-400 text-sm mt-0.5">{formatPrice(item.price)}</p>
 </div>
 <div className="flex items-center gap-3">
 <Button
 variant="outline"
 onClick={() => updateQuantity(item.id, item.quantity - 1)}
 className="h-8 w-8 rounded-md border-stone-200 dark:border-stone-800 p-0 hover:border-stone-400 hover:bg-transparent [&_svg]:size-3.5"
 aria-label={`${t('cart.updateQuantity')}: ${item.name}`}
 >
 <Minus className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300 " />
 </Button>
 <span className="w-8 text-center text-sm font-medium text-stone-900 dark:text-stone-50 ">{item.quantity}</span>
 <Button
 variant="outline"
 onClick={() => updateQuantity(item.id, item.quantity + 1)}
 disabled={(() => {
 const isTrackingStock = item.trackStock ?? true;
 if (!isTrackingStock) return false;
 const availableStock = item.stock ?? 0;
 return item.quantity >= availableStock;
 })()}
 className="h-8 w-8 rounded-md border-stone-200 dark:border-stone-800 p-0 hover:border-stone-400 hover:bg-transparent disabled:opacity-40 disabled:hover:border-stone-200 dark:disabled:hover:border-stone-800:border-stone-800 [&_svg]:size-3.5"
 aria-label={`${t('cart.updateQuantity')}: ${item.name}`}
 >
 <Plus className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300 " />
 </Button>
 </div>
 <div className="flex items-center gap-4">
 <p className="font-medium text-stone-900 dark:text-stone-50 text-sm">{formatPrice(item.price * item.quantity)}</p>
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
 <Card className="sticky top-24 rounded-lg border-stone-200 dark:border-stone-800 p-6 shadow-none">
 <h2 className="font-serif text-lg font-medium text-stone-900 dark:text-stone-50 mb-5">{t('cart.orderSummary')}</h2>
 <div className="flex justify-between mb-6 text-sm">
 <span className="text-stone-500 dark:text-stone-400 ">{t('common.subtotal')}</span>
 <span className="font-medium text-stone-900 dark:text-stone-50 ">{formatPrice(calculateTotal())}</span>
 </div>
 <div className="border-t border-stone-200 dark:border-stone-800 pt-4 mb-6">
 <div className="flex justify-between">
 <span className="font-medium text-stone-900 dark:text-stone-50 ">{t('common.total')}</span>
 <span className="font-semibold text-stone-900 dark:text-stone-50 ">{formatPrice(calculateTotal())}</span>
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
 </div>
 );
};

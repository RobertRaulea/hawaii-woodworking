import type React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useConvexAuth, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Eye } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_BADGES: Record<
 OrderStatus,
 'yellow' | 'success' | 'blue' | 'emerald' | 'destructive'
> = {
 pending: 'yellow',
 paid: 'success',
 shipped: 'blue',
 delivered: 'emerald',
 cancelled: 'destructive',
};



const formatPrice = (price: number): string => `${price.toFixed(2)} RON`;

export const MyOrders: React.FC = () => {
 const { t, i18n } = useTranslation();
 const { isSignedIn, isLoaded } = useAuth();
 const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
 const orders = useQuery(
 api.orders.getMyOrders,
 isLoaded && isSignedIn && isAuthenticated && !isAuthLoading ? {} : 'skip'
 );

 const STATUS_LABELS: Record<OrderStatus, string> = {
 pending: t('orders.pending'),
 paid: t('orders.paid'),
 shipped: t('orders.shipped'),
 delivered: t('orders.delivered'),
 cancelled: t('orders.cancelled'),
 };

 const formatDate = (timestamp: number): string => {
 const locale = i18n.language === 'de' ? 'de-DE' : i18n.language === 'en' ? 'en-US' : 'ro-RO';
 return new Date(timestamp).toLocaleDateString(locale, {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 });
 };

 if (!isLoaded) {
 return (
 <div className="flex items-center justify-center min-h-[60vh]">
 <Spinner className="size-6 text-amber-600" />
 </div>
 );
 }

 if (!isSignedIn) {
 return <Navigate to="/login" replace />;
 }

 if (orders === undefined) {
 return (
 <div className="flex items-center justify-center min-h-[60vh]">
 <Spinner className="size-6 text-amber-600" />
 </div>
 );
 }

 return (
 <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
 <h1 className="font-serif text-3xl lg:text-4xl font-medium text-foreground mb-8">{t('orders.title')}</h1>

 {orders.length === 0 ? (
 <Empty className="gap-0 flex-initial rounded-lg border border-dashed border-stone-300 dark:border-stone-700 p-16 text-center shadow-none">
 <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
 <ShoppingBag className="size-6 text-stone-400 dark:text-stone-500 " />
 </div>
 <p className="font-serif text-xl font-medium text-foreground mb-2">{t('orders.noOrders')}</p>
 <p className="text-muted-foreground text-sm mb-8">{t('orders.noOrdersDescription')}</p>
 <Button
 asChild
 variant="outline"
 className="h-auto rounded-md border-stone-900 dark:border-stone-400 px-8 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-50 dark:hover:text-stone-900"
 >
 <Link to="/products">{t('orders.viewProducts')}</Link>
 </Button>
 </Empty>
 ) : (
 <div className="space-y-3">
 {orders.map((order) => (
 <Card
 key={order._id}
 className="rounded-lg border-border p-5 shadow-none transition-all duration-200 hover:border-stone-300 dark:hover:border-stone-700"
 >
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <span className="font-mono text-xs text-stone-400 dark:text-stone-500 tracking-wide">
 #{order._id.slice(-8).toUpperCase()}
 </span>
 <Badge
 variant={STATUS_BADGES[order.status as OrderStatus]}
 className="rounded-full border-0 px-2.5 py-0.5 text-xs font-medium"
 >
 {STATUS_LABELS[order.status as OrderStatus]}
 </Badge>
 </div>
 <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">
 {formatDate(order.createdAt)}
 </p>
 <p className="text-sm text-stone-600 dark:text-stone-300 ">
 {order.items.length} {order.items.length === 1 ? t('orders.item') : t('orders.items')} &middot;{' '}
 <span className="font-semibold text-foreground">
 {formatPrice(order.total)}
 </span>
 </p>
 </div>

 <Button
 asChild
 variant="outline"
 className="h-auto items-center gap-1.5 rounded-md border-border px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300hover:border-stone-400 hover:bg-transparent hover:text-foreground [&_svg]:size-3.5"
 >
 <Link to={`/my-orders/${order._id}`}>
 <Eye className="h-3.5 w-3.5" />
 {t('orders.viewDetails')}
 </Link>
 </Button>
 </div>
 </Card>
 ))}
 </div>
 )}
 </div>
 );
};

export default MyOrders;

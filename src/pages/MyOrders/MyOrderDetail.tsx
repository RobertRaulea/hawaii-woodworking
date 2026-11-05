import type React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useConvexAuth } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAdminQuery } from '../../hooks/useAdminQuery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
 Table,
 TableBody,
 TableCell,
 TableFooter,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';

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

interface AddressDisplayProps {
 label: string;
 address: {
 street: string;
 city: string;
 county: string;
 postalCode: string;
 country: string;
 };
}

const AddressDisplay: React.FC<AddressDisplayProps> = ({ label, address }) => (
 <div>
 <h4 className="text-sm font-medium text-muted-foreground mb-1">{label}</h4>
 <p className="text-sm text-foreground">{address.street}</p>
 <p className="text-sm text-foreground">
 {address.city}, {address.county} {address.postalCode}
 </p>
 <p className="text-sm text-foreground">{address.country}</p>
 </div>
);

export const MyOrderDetail: React.FC = () => {
 const { t, i18n } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const { isSignedIn, isLoaded } = useAuth();
 const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
 const language = i18n.language === 'de' ? 'de' : i18n.language === 'en' ? 'en' : 'ro';

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

 const { data: order, error } = useAdminQuery(
 api.orders.getMyOrderById,
 isLoaded && isSignedIn && isAuthenticated && !isAuthLoading && id
 ? { orderId: id as Id<'orders'> }
 : 'skip'
 );

 if (!isLoaded) {
 return (
 <div className="flex items-center justify-center min-h-[60vh]">
 <p className="text-muted-foreground">{t('common.loading')}</p>
 </div>
 );
 }

 if (!isSignedIn) {
 return <Navigate to="/login" replace />;
 }

 if (error) {
 return (
 <div role="alert" className="mx-auto max-w-4xl px-4 py-12 text-center md:px-6">
 <h1 className="font-serif text-2xl text-foreground">
 {t('common.error')}
 </h1>
 <p className="mt-3 text-stone-600 dark:text-stone-300">
 {t('errors.loadFailed', {
 defaultValue: {
 ro: 'Datele nu pot fi încărcate. Te rugăm să reîncarci pagina.',
 en: 'The data could not be loaded. Please reload the page.',
 de: 'Die Daten konnten nicht geladen werden. Bitte lade die Seite neu.',
 }[language],
 })}
 </p>
 <div className="mt-6 flex flex-wrap justify-center gap-3">
 <Button asChild variant="secondary">
 <Link to="/my-orders">{t('orders.backToOrders')}</Link>
 </Button>
 <Button onClick={() => window.location.reload()}>
 {t('common.reload', {
 defaultValue: {
 ro: 'Reîncarcă pagina',
 en: 'Reload page',
 de: 'Seite neu laden',
 }[language],
 })}
 </Button>
 </div>
 </div>
 );
 }

 if (order === undefined) {
 return (
 <div className="flex items-center justify-center min-h-[60vh]">
 <p className="text-muted-foreground">{t('orders.loadingOrder')}</p>
 </div>
 );
 }

 if (order === null) {
 return (
 <div className="container mx-auto px-4 py-12 text-center">
 <p className="text-muted-foreground mb-4">{t('orders.orderNotFound')}</p>
 <Button
 asChild
 variant="ghost"
 className="h-auto p-0 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-transparent hover:text-amber-700 dark:hover:text-amber-400"
 >
 <Link to="/my-orders">← {t('orders.backToOrders')}</Link>
 </Button>
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
 {/* Header */}
 <div className="mb-6">
 <Button
 asChild
 variant="ghost"
 className="mb-3 h-auto items-center gap-1 p-0 text-sm text-muted-foreground transition-colors hover:bg-transparent hover:text-stone-700 dark:hover:text-stone-300"
 >
 <Link to="/my-orders">
 <ArrowLeft className="size-4" />
 {t('orders.backToOrders')}
 </Link>
 </Button>
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl font-bold text-foreground">
 {t('orders.orderNumber')}{order._id.slice(-8).toUpperCase()}
 </h1>
 <p className="text-sm text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>
 </div>
 <Badge
 variant={STATUS_BADGES[order.status as OrderStatus]}
 className="self-start rounded-full border-0 px-3 py-1 text-sm font-medium"
 >
 {STATUS_LABELS[order.status as OrderStatus]}
 </Badge>
 </div>
 </div>

 {/* Addresses */}
 {order.customer && (
 <Card className="mb-6 rounded-lg border-border p-5 shadow-none">
 <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">{t('orders.shippingInfo')}</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <h4 className="text-sm font-medium text-muted-foreground mb-1">{t('orders.name')}</h4>
 <p className="text-sm text-foreground">
 {order.customer.firstName} {order.customer.lastName}
 </p>
 </div>
 <div>
 <h4 className="text-sm font-medium text-muted-foreground mb-1">{t('orders.email')}</h4>
 <p className="text-sm text-foreground">{order.customer.email}</p>
 </div>
 <AddressDisplay label={t('orders.shippingAddress')} address={order.customer.shippingAddress} />
 <AddressDisplay label={t('orders.billingAddress')} address={order.customer.billingAddress} />
 </div>
 </Card>
 )}

 {/* Order Items */}
 <Card className="mb-6 rounded-lg border-border p-5 shadow-none">
 <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">{t('orders.orderedProducts')}</h3>
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow className="border-border hover:bg-transparent">
 <TableHead className="px-0 pb-2 text-left font-medium text-stone-600 dark:text-stone-300 ">{t('orders.product')}</TableHead>
 <TableHead className="px-0 pb-2 text-right font-medium text-stone-600 dark:text-stone-300 ">{t('orders.price')}</TableHead>
 <TableHead className="px-0 pb-2 text-right font-medium text-stone-600 dark:text-stone-300 ">{t('orders.quantity')}</TableHead>
 <TableHead className="px-0 pb-2 text-right font-medium text-stone-600 dark:text-stone-300 ">{t('orders.subtotal')}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {order.items.map((item: { productId: string; name: string; price: number; quantity: number }, index: number) => (
 <TableRow
 key={`${item.productId}-${index}`}
 className="border-stone-100 dark:border-stone-800 hover:bg-transparent last:border-b-0"
 >
 <TableCell className="px-0 py-3 text-foreground">{item.name}</TableCell>
 <TableCell className="px-0 py-3 text-right text-stone-700 dark:text-stone-300 ">{formatPrice(item.price)}</TableCell>
 <TableCell className="px-0 py-3 text-right text-stone-700 dark:text-stone-300 ">{item.quantity}</TableCell>
 <TableCell className="px-0 py-3 text-right font-medium text-foreground">
 {formatPrice(item.price * item.quantity)}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 <TableFooter>
 <TableRow className="border-t-2 border-border hover:bg-transparent">
 <TableCell colSpan={3} className="px-0 pt-3 text-right font-semibold text-stone-800 dark:text-stone-100 ">
 {t('orders.total')}
 </TableCell>
 <TableCell className="px-0 pt-3 text-right font-bold text-foreground text-base">
 {formatPrice(order.total)}
 </TableCell>
 </TableRow>
 </TableFooter>
 </Table>
 </div>
 </Card>
 </div>
 );
};

export default MyOrderDetail;

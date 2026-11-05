import type React from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OptionSelect } from '../../../components/OptionSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn.utils';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { InventoryReviewSummary } from './InventoryReviewSummary';
import type { OrderAdminRow } from '../../../types/orders.types';

const PAGE_SIZE = 25;

const PAYMENT_LABELS: Record<string, string> = {
 pending: 'Neplătită',
 paid: 'Plătită',
 cancelled: 'Anulată',
};

const PAYMENT_BADGES: Record<
 string,
 { variant: 'yellow' | 'success' | 'destructive' }
> = {
 pending: { variant: 'yellow' },
 paid: { variant: 'success' },
 cancelled: { variant: 'destructive' },
};

const FULFILLMENT_LABELS: Record<string, string> = {
 ready: 'De pregătit',
 preparing: 'În pregătire',
 packed: 'Ambalată',
 shipped: 'Expediată',
 delivered: 'Livrată',
 blocked: 'Blocată',
 cancelled: 'Anulată',
};

const FULFILLMENT_BADGES: Record<
 string,
 {
 variant: 'amber' | 'blue' | 'soft' | 'emerald' | 'stone' | 'destructive';
 className?: string;
 }
> = {
 ready: { variant: 'amber' },
 preparing: { variant: 'blue' },
 packed: { variant: 'soft', className: 'bg-indigo-100 text-indigo-800' },
 shipped: { variant: 'emerald' },
 delivered: { variant: 'emerald' },
 blocked: { variant: 'stone' },
 cancelled: { variant: 'destructive' },
};

const formatDate = (timestamp: number): string =>
 new Date(timestamp).toLocaleDateString('ro-RO', {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 });

const formatPrice = (price: number): string => `${price.toFixed(2)} RON`;

const dayStart = (value: string): number | undefined => {
 if (!value) return undefined;
 const date = new Date(`${value}T00:00:00`);
 return Number.isNaN(date.getTime()) ? undefined : date.getTime();
};

const dayEnd = (value: string): number | undefined => {
 if (!value) return undefined;
 const date = new Date(`${value}T23:59:59.999`);
 return Number.isNaN(date.getTime()) ? undefined : date.getTime();
};

export const AdminOrders: React.FC = () => {
 const [search, setSearch] = useState('');
 const [fromDate, setFromDate] = useState('');
 const [toDate, setToDate] = useState('');
 const [paymentFilter, setPaymentFilter] = useState('all');
 const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
 const [page, setPage] = useState(1);

 const args = useMemo(() => {
 const from = dayStart(fromDate);
 const to = dayEnd(toDate);
 return {
 ...(from !== undefined ? { from } : {}),
 ...(to !== undefined ? { to } : {}),
 };
 }, [fromDate, toDate]);

 const { data: orders, error } = useAdminQuery(api.orders.listAdmin, args);

 const filtered = useMemo(() => {
 if (!orders) return [];
 const term = search.trim().toLowerCase();
 return orders.filter((order: OrderAdminRow) => {
 if (paymentFilter !== 'all' && order.paymentStatus !== paymentFilter)
 return false;
 if (
 fulfillmentFilter !== 'all' &&
 order.fulfillmentState !== fulfillmentFilter
 )
 return false;
 if (!term) return true;
 const customerName = order.customer
 ? `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase()
 : '';
 return (
 order._id.toLowerCase().includes(term) ||
 order.shortNumber.toLowerCase().includes(term) ||
 customerName.includes(term) ||
 (order.customer?.email.toLowerCase().includes(term) ?? false) ||
 order.stripeSessionId.toLowerCase().includes(term)
 );
 });
 }, [orders, search, paymentFilter, fulfillmentFilter]);

 const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
 const currentPage = Math.min(page, pageCount);
 const pageRows = filtered.slice(
 (currentPage - 1) * PAGE_SIZE,
 currentPage * PAGE_SIZE,
 );

 const resetPage = () => setPage(1);

 if (error) {
 return (
 <Alert variant="destructive">
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 );
 }

 if (orders === undefined) {
 return (
 <div className="flex items-center justify-center py-20">
 <p className="text-muted-foreground">Se încarcă comenzile…</p>
 </div>
 );
 }

 return (
 <section className="max-w-6xl space-y-6">
 <header>
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-foreground">Comenzi</h1>
 <p className="mt-1 text-sm text-muted-foreground">
 Toate comenzile online, cu starea plății și a pregătirii.
 </p>
 </header>

 <InventoryReviewSummary />

 <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2 lg:grid-cols-5">
 <div className="lg:col-span-2">
 <Label htmlFor="order-search">Caută</Label>
 <Input
 id="order-search"
 type="search"
 value={search}
 onChange={(event) => {
 setSearch(event.target.value);
 resetPage();
 }}
 placeholder="Număr comandă, client, email sau sesiune Stripe"
 className="mt-1 h-auto w-full rounded-lg px-3 py-2"
 />
 </div>
 <div>
 <Label htmlFor="orders-from">De la</Label>
 <Input
 id="orders-from"
 type="date"
 value={fromDate}
 onChange={(event) => {
 setFromDate(event.target.value);
 resetPage();
 }}
 className="mt-1 h-auto w-full rounded-lg px-3 py-2"
 />
 </div>
 <div>
 <Label htmlFor="orders-to">Până la</Label>
 <Input
 id="orders-to"
 type="date"
 value={toDate}
 onChange={(event) => {
 setToDate(event.target.value);
 resetPage();
 }}
 className="mt-1 h-auto w-full rounded-lg px-3 py-2"
 />
 </div>
 <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
 <div>
 <Label htmlFor="payment-filter">Stare plată</Label>
 <OptionSelect
 id="payment-filter"
 value={paymentFilter}
 onValueChange={(v) => {
 setPaymentFilter(v);
 resetPage();
 }}
 wrapperClassName="mt-1 w-full"
 className="rounded-lg px-3 py-2"
 options={[
 { value: 'all', label: 'Toate' },
 { value: 'pending', label: 'Neplătită' },
 { value: 'paid', label: 'Plătită' },
 { value: 'cancelled', label: 'Anulată' },
 ]}
 />
 </div>
 <div>
 <Label htmlFor="fulfillment-filter">Stare pregătire</Label>
 <OptionSelect
 id="fulfillment-filter"
 value={fulfillmentFilter}
 onValueChange={(v) => {
 setFulfillmentFilter(v);
 resetPage();
 }}
 wrapperClassName="mt-1 w-full"
 className="rounded-lg px-3 py-2"
 options={[
 { value: 'all', label: 'Toate' },
 { value: 'ready', label: 'De pregătit' },
 { value: 'preparing', label: 'În pregătire' },
 { value: 'packed', label: 'Ambalată' },
 { value: 'shipped', label: 'Expediată' },
 { value: 'delivered', label: 'Livrată' },
 { value: 'blocked', label: 'Blocată' },
 { value: 'cancelled', label: 'Anulată' },
 ]}
 />
 </div>
 </div>
 </div>

 {pageRows.length === 0 ? (
 <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
 Nicio comandă nu corespunde filtrelor.
 </p>
 ) : (
 <div className="overflow-x-auto rounded-lg border border-border bg-card">
 <Table className="w-full text-sm">
 <TableHeader>
 <TableRow className="text-left">
 <TableHead className="px-4 py-3 font-medium text-stone-600 dark:text-stone-300 ">
 Comandă
 </TableHead>
 <TableHead className="px-4 py-3 font-medium text-stone-600 dark:text-stone-300 ">
 Client
 </TableHead>
 <TableHead className="px-4 py-3 font-medium text-stone-600 dark:text-stone-300 ">
 Data
 </TableHead>
 <TableHead className="px-4 py-3 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Produse
 </TableHead>
 <TableHead className="px-4 py-3 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Total
 </TableHead>
 <TableHead className="px-4 py-3 font-medium text-stone-600 dark:text-stone-300 ">
 Plată
 </TableHead>
 <TableHead className="px-4 py-3 font-medium text-stone-600 dark:text-stone-300 ">
 Pregătire
 </TableHead>
 <TableHead className="px-4 py-3 font-medium text-stone-600 dark:text-stone-300 ">
 Acțiuni
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {pageRows.map((order) => (
 <TableRow
 key={order._id}
 className="border-stone-100 dark:border-stone-800 last:border-b-0 hover:bg-transparent"
 >
 <TableCell className="px-4 py-3 font-medium text-foreground">
 #{order.shortNumber}
 </TableCell>
 <TableCell className="px-4 py-3 text-stone-700 dark:text-stone-300 ">
 {order.customer
 ? `${order.customer.firstName} ${order.customer.lastName}`
 : '—'}
 </TableCell>
 <TableCell className="px-4 py-3 text-stone-600 dark:text-stone-300 ">
 {formatDate(order.createdAt)}
 </TableCell>
 <TableCell className="px-4 py-3 text-right text-stone-700 dark:text-stone-300 ">
 {order.itemCount}
 </TableCell>
 <TableCell className="px-4 py-3 text-right font-medium text-foreground">
 {formatPrice(order.total ?? 0)}
 </TableCell>
 <TableCell className="px-4 py-3">
 <Badge
 variant={PAYMENT_BADGES[order.paymentStatus].variant}
 className="font-medium"
 >
 {order.paymentStatus === 'paid' &&
 order.status === 'cancelled'
 ? 'Plătită — rambursare manuală necesară'
 : PAYMENT_LABELS[order.paymentStatus]}
 </Badge>
 </TableCell>
 <TableCell className="px-4 py-3">
 <Badge
 variant={FULFILLMENT_BADGES[order.fulfillmentState].variant}
 className={cn(
 'font-medium',
 FULFILLMENT_BADGES[order.fulfillmentState].className
 )}
 >
 {FULFILLMENT_LABELS[order.fulfillmentState]}
 </Badge>
 </TableCell>
 <TableCell className="px-4 py-3">
 <Button
 asChild
 variant="link"
 className="h-auto gap-1 p-0 text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:no-underline"
 >
 <Link
 to={`/admin/orders/${order._id}`}
 aria-label={`Deschide comanda ${order.shortNumber}`}
 >
 <Eye className="size-4" />
 Deschide
 </Link>
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}

 {pageCount > 1 ? (
 <nav
 aria-label="Paginare comenzi"
 className="flex items-center justify-between"
 >
 <Button
 type="button"
 variant="outline"
 onClick={() => setPage(currentPage - 1)}
 disabled={currentPage <= 1}
 className="rounded-lg"
 >
 Înapoi
 </Button>
 <p className="text-sm text-stone-600 dark:text-stone-300 ">
 Pagina {currentPage} din {pageCount}
 </p>
 <Button
 type="button"
 variant="outline"
 onClick={() => setPage(currentPage + 1)}
 disabled={currentPage >= pageCount}
 className="rounded-lg"
 >
 Înainte
 </Button>
 </nav>
 ) : null}
 </section>
 );
};

export default AdminOrders;

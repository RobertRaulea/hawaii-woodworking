import type React from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const PAYMENT_COLORS: Record<string, string> = {
 pending: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 ',
 paid: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 ',
 cancelled: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 ',
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

const FULFILLMENT_COLORS: Record<string, string> = {
 ready: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 ',
 preparing: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 ',
 packed: 'bg-indigo-100 text-indigo-800',
 shipped: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 ',
 delivered: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 ',
 blocked: 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 ',
 cancelled: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 ',
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
 <p className="text-stone-500 dark:text-stone-400 ">Se încarcă comenzile…</p>
 </div>
 );
 }

 return (
 <section className="max-w-6xl space-y-6">
 <header>
 <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 ">Comenzi</h1>
 <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 ">
 Toate comenzile online, cu starea plății și a pregătirii.
 </p>
 </header>

 <InventoryReviewSummary />

 <div className="grid grid-cols-1 gap-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 md:grid-cols-2 lg:grid-cols-5">
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
 <select
 id="payment-filter"
 value={paymentFilter}
 onChange={(event) => {
 setPaymentFilter(event.target.value);
 resetPage();
 }}
 className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
 >
 <option value="all">Toate</option>
 <option value="pending">Neplătită</option>
 <option value="paid">Plătită</option>
 <option value="cancelled">Anulată</option>
 </select>
 </div>
 <div>
 <Label htmlFor="fulfillment-filter">Stare pregătire</Label>
 <select
 id="fulfillment-filter"
 value={fulfillmentFilter}
 onChange={(event) => {
 setFulfillmentFilter(event.target.value);
 resetPage();
 }}
 className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
 >
 <option value="all">Toate</option>
 <option value="ready">De pregătit</option>
 <option value="preparing">În pregătire</option>
 <option value="packed">Ambalată</option>
 <option value="shipped">Expediată</option>
 <option value="delivered">Livrată</option>
 <option value="blocked">Blocată</option>
 <option value="cancelled">Anulată</option>
 </select>
 </div>
 </div>
 </div>

 {pageRows.length === 0 ? (
 <p className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 text-sm text-stone-500 dark:text-stone-400 ">
 Nicio comandă nu corespunde filtrelor.
 </p>
 ) : (
 <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 ">
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
 <TableCell className="px-4 py-3 font-medium text-stone-900 dark:text-stone-50 ">
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
 <TableCell className="px-4 py-3 text-right font-medium text-stone-900 dark:text-stone-50 ">
 {formatPrice(order.total ?? 0)}
 </TableCell>
 <TableCell className="px-4 py-3">
 <Badge
 variant="soft"
 className={`font-medium ${PAYMENT_COLORS[order.paymentStatus]}`}
 >
 {order.paymentStatus === 'paid' &&
 order.status === 'cancelled'
 ? 'Plătită — rambursare manuală necesară'
 : PAYMENT_LABELS[order.paymentStatus]}
 </Badge>
 </TableCell>
 <TableCell className="px-4 py-3">
 <Badge
 variant="soft"
 className={`font-medium ${FULFILLMENT_COLORS[order.fulfillmentState]}`}
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
 <Eye className="h-4 w-4" />
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
 className="rounded-lg px-4 py-2 text-sm font-medium"
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
 className="rounded-lg px-4 py-2 text-sm font-medium"
 >
 Înainte
 </Button>
 </nav>
 ) : null}
 </section>
 );
};

export default AdminOrders;

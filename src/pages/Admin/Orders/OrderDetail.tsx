import type React from 'react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCw } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { useStaffDirectory } from '../../../hooks/useStaffDirectory';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { useOrderAction } from '../../../hooks/useOrderAction';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { ProductThumb } from '../../../components/ProductThumb';
import { useProductThumbnails } from '../../../hooks/useProductThumbnails';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
 Table,
 TableBody,
 TableCell,
 TableFooter,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { OrderInventoryReview } from './OrderInventoryReview';
import type { OrderAdminEvent } from '../../../types/orders.types';

const PAYMENT_LABELS: Record<string, string> = {
 pending: 'Neplătită',
 paid: 'Plătită',
 cancelled: 'Anulată',
};

const PAYMENT_BADGES: Record<
 string,
 'yellow' | 'success' | 'destructive'
> = {
 pending: 'yellow',
 paid: 'success',
 cancelled: 'destructive',
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

const EVENT_LABELS: Record<OrderAdminEvent['kind'], string> = {
 claimed: 'Preluată',
 released: 'Eliberată',
 reassigned: 'Realocată',
 checked: 'Produs bifat',
 note: 'Notiță',
 packed: 'Ambalată',
 shipped: 'Expediată',
 delivered: 'Livrată',
 cancelled: 'Anulată',
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

export const OrderDetail: React.FC = () => {
 const { id } = useParams<{ id: string }>();
 const { userId } = useStaffAccess();
 const userLabel = useStaffDirectory();
 const thumbnails = useProductThumbnails();
 const controller = useOrderAction(userId);
 const { data: order, error: orderError } = useAdminQuery(
 api.orders.getAdmin,
 id ? { orderId: id as Id<'orders'> } : 'skip',
 );
 const [note, setNote] = useState('');
 const [cancelOpen, setCancelOpen] = useState(false);
 const [cancelReason, setCancelReason] = useState('');
 const [reassignOpen, setReassignOpen] = useState(false);
 const [reassignUser, setReassignUser] = useState('');

 if (orderError) {
 return (
 <Alert variant="destructive" className="rounded-xl">
 <AlertDescription>{orderError}</AlertDescription>
 </Alert>
 );
 }

 if (order === undefined) {
 return (
 <div className="flex items-center justify-center py-20">
 <p className="text-muted-foreground">Se încarcă comanda…</p>
 </div>
 );
 }

 if (order === null) {
 return (
 <div className="py-20 text-center">
 <p className="mb-4 text-muted-foreground">Comanda nu a fost găsită.</p>
 <Link
 to="/admin/orders"
 className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-400"
 >
 ← Înapoi la Comenzi
 </Link>
 </div>
 );
 }

 const canAct = !controller.busy && !controller.blocked && controller.online;
 const cancellable =
 order.status !== 'cancelled' &&
 order.status !== 'shipped' &&
 order.status !== 'delivered';
 const reassignable =
 order.fulfillmentState === 'preparing' ||
 order.fulfillmentState === 'packed';
 const manualRefund =
 order.status === 'cancelled' && order.paymentStatus === 'paid';

 return (
 <section className="max-w-4xl space-y-6">
 <div>
 <Link
 to="/admin/orders"
 className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-stone-700 dark:hover:text-stone-300"
 >
 <ArrowLeft className="size-4" />
 Înapoi la Comenzi
 </Link>
 <div className="flex flex-wrap items-center justify-between gap-3">
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-foreground">
 Comanda #{order.shortNumber}
 </h1>
 <div className="flex flex-wrap items-center gap-2">
 <Badge
 variant={PAYMENT_BADGES[order.paymentStatus]}
 className="px-3 py-1 text-sm font-medium"
 >
 {manualRefund
 ? 'Plătită — rambursare manuală necesară'
 : order.paymentMethod === 'cod' && order.paymentStatus === 'pending'
 ? `Ramburs — de încasat ${order.total.toFixed(2)} RON`
 : order.paymentMethod === 'cod'
 ? 'Ramburs — încasat'
 : PAYMENT_LABELS[order.paymentStatus]}
 </Badge>
 <Badge
 variant="soft"
 className="bg-stone-200 dark:bg-stone-700 px-3 py-1 text-sm font-medium"
 >
 {FULFILLMENT_LABELS[order.fulfillmentState]}
 </Badge>
 </div>
 </div>
 <p className="mt-1 text-sm text-muted-foreground">
 {formatDate(order.createdAt)}
 </p>
 </div>

 {controller.error ? (
 <Alert
 variant="destructive"
 className="flex flex-wrap items-center gap-3"
 >
 <AlertDescription>{controller.error}</AlertDescription>
 {controller.pending ? (
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => void controller.retry()}
 disabled={controller.busy || !controller.online}
 className="gap-1 border-red-300 dark:border-red-700 px-3 py-1.5 font-medium text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-800 dark:hover:text-red-300"
 >
 <RotateCw className="size-4" />
 Reîncearcă
 </Button>
 ) : null}
 </Alert>
 ) : null}

 <OrderInventoryReview order={order} />

 {order.customer ? (
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">Client</h2>
 <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
 <div>
 <p className="text-sm font-medium text-muted-foreground">Nume</p>
 <p className="text-sm text-foreground">
 {order.customer.firstName} {order.customer.lastName}
 </p>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground">Email</p>
 <p className="text-sm text-foreground">{order.customer.email}</p>
 </div>
 {order.shipping ? (
 <div>
 <p className="text-sm font-medium text-muted-foreground">
 Adresă de livrare (
 {order.shippingSource === 'snapshot'
 ? 'din comandă'
 : 'din fișa clientului'}
 )
 </p>
 <p className="text-sm text-foreground">
 {order.shipping.firstName} {order.shipping.lastName}
 </p>
 <p className="text-sm text-stone-700 dark:text-stone-300 ">
 {order.shipping.address.street}
 </p>
 <p className="text-sm text-stone-700 dark:text-stone-300 ">
 {order.shipping.address.city},{' '}
 {order.shipping.address.county}{' '}
 {order.shipping.address.postalCode}
 </p>
 <p className="text-sm text-stone-700 dark:text-stone-300 ">
 {order.shipping.address.country}
 </p>
 </div>
 ) : null}
 {order.customer.billingAddress ? (
 <div>
 <p className="text-sm font-medium text-muted-foreground">
 Adresă de facturare
 </p>
 <p className="text-sm text-foreground">
 {order.customer.billingAddress.street}
 </p>
 <p className="text-sm text-stone-700 dark:text-stone-300 ">
 {order.customer.billingAddress.city},{' '}
 {order.customer.billingAddress.county}{' '}
 {order.customer.billingAddress.postalCode}
 </p>
 <p className="text-sm text-stone-700 dark:text-stone-300 ">
 {order.customer.billingAddress.country}
 </p>
 </div>
 ) : null}
 </div>
 </CardContent>
 </Card>
 ) : null}

 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">Produse</h2>
 <div className="overflow-x-auto">
 <Table className="mt-3 w-full text-sm">
 <TableHeader>
 <TableRow className="hover:bg-transparent">
 <TableHead className="pb-2 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Produs
 </TableHead>
 <TableHead className="pb-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Preț
 </TableHead>
 <TableHead className="pb-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Cantitate
 </TableHead>
 <TableHead className="pb-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Subtotal
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {order.items.map((item, index) => (
 <TableRow
 key={`${item.productId}-${index}`}
 className="border-stone-100 dark:border-stone-800 last:border-b-0 hover:bg-transparent"
 >
 <TableCell className="py-3 text-foreground">
 <span className="flex items-center gap-3">
 <ProductThumb
 src={thumbnails.get(item.productId)}
 alt={item.name}
 />
 {item.name}
 </span>
 </TableCell>
 <TableCell className="py-3 text-right text-stone-700 dark:text-stone-300 ">
 {formatPrice(item.price ?? 0)}
 </TableCell>
 <TableCell className="py-3 text-right text-stone-700 dark:text-stone-300 ">
 {item.quantity}
 </TableCell>
 <TableCell className="py-3 text-right font-medium text-foreground">
 {formatPrice((item.price ?? 0) * item.quantity)}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 <TableFooter className="bg-transparent">
 {order.shippingCost !== undefined && (
 <>
 <TableRow className="border-t-2 border-border hover:bg-transparent">
 <TableCell colSpan={3} className="pt-3 text-right text-sm text-stone-600 dark:text-stone-300 ">
 Subtotal produse
 </TableCell>
 <TableCell className="pt-3 text-right text-sm font-medium text-foreground">
 {formatPrice((order.total ?? 0) - order.shippingCost - (order.codFee ?? 0))}
 </TableCell>
 </TableRow>
 <TableRow className="hover:bg-transparent">
 <TableCell colSpan={3} className="py-1 text-right text-sm text-stone-600 dark:text-stone-300 ">
 Transport
 </TableCell>
 <TableCell className="py-1 text-right text-sm font-medium text-foreground">
 {order.shippingCost > 0 ? formatPrice(order.shippingCost) : 'Gratuit'}
 </TableCell>
 </TableRow>
 {(order.codFee ?? 0) > 0 && (
 <TableRow className="hover:bg-transparent">
 <TableCell colSpan={3} className="py-1 text-right text-sm text-stone-600 dark:text-stone-300 ">
 Taxă ramburs
 </TableCell>
 <TableCell className="py-1 text-right text-sm font-medium text-foreground">
 {formatPrice(order.codFee ?? 0)}
 </TableCell>
 </TableRow>
 )}
 </>
 )}
 <TableRow className={`${order.shippingCost === undefined ? 'border-t-2 border-border ' : ''}hover:bg-transparent`}>
 <TableCell
 colSpan={3}
 className="pt-3 text-right font-semibold text-stone-800 dark:text-stone-100 "
 >
 Total
 </TableCell>
 <TableCell className="pt-3 text-right text-base font-bold text-foreground">
 {formatPrice(order.total ?? 0)}
 </TableCell>
 </TableRow>
 </TableFooter>
 </Table>
 </div>
 </CardContent>
 </Card>

 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">
 Pregătire și expediere
 </h2>
 <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
 <div>
 <dt className="font-medium text-muted-foreground">Operator</dt>
 <dd className="text-foreground">
 {order.assignedTo ? userLabel(order.assignedTo) : 'Nealocată'}
 </dd>
 </div>
 <div>
 <dt className="font-medium text-muted-foreground">Expediere</dt>
 <dd className="text-foreground">
 {order.carrier || order.awb
 ? `${order.carrier ?? '—'} · AWB ${order.awb ?? '—'}`
 : 'Neexpediată'}
 </dd>
 </div>
 {order.shippedAt ? (
 <div>
 <dt className="font-medium text-muted-foreground">Expediată la</dt>
 <dd className="text-foreground">
 {formatDate(order.shippedAt)}
 </dd>
 </div>
 ) : null}
 {order.deliveredAt ? (
 <div>
 <dt className="font-medium text-muted-foreground">Livrată la</dt>
 <dd className="text-foreground">
 {formatDate(order.deliveredAt)}
 </dd>
 </div>
 ) : null}
 {order.cancelReason ? (
 <div className="md:col-span-2">
 <dt className="font-medium text-muted-foreground">Motiv anulare</dt>
 <dd className="text-foreground">{order.cancelReason}</dd>
 </div>
 ) : null}
 </dl>
 <div className="mt-4 flex flex-wrap gap-2">
 {order.fulfillmentState !== 'cancelled' ? (
 <Button
 asChild
 variant="outline"
 className="rounded-lg"
 >
 <Link to={`/admin/fulfillment/${order._id}`}>
 Deschide în pregătire comenzi
 </Link>
 </Button>
 ) : null}
 {reassignable ? (
 <Button
 type="button"
 variant="outline"
 disabled={!canAct}
 onClick={() => setReassignOpen(true)}
 className="rounded-lg"
 >
 Realocă
 </Button>
 ) : null}
 {cancellable ? (
 <Button
 type="button"
 variant="destructive"
 disabled={!canAct}
 onClick={() => setCancelOpen(true)}
 className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700"
 >
 Anulează comanda
 </Button>
 ) : null}
 {order.invoicePdfUrl ? (
 <Button
 asChild
 variant="outline"
 className="rounded-lg"
 >
 <a
 href={order.invoicePdfUrl}
 target="_blank"
 rel="noreferrer"
 >
 Deschide factura
 </a>
 </Button>
 ) : null}
 </div>
 </CardContent>
 </Card>

 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">Notițe</h2>
 <div className="mt-3 flex flex-col gap-2 md:flex-row">
 <Label className="sr-only" htmlFor="admin-order-note">
 Notiță nouă
 </Label>
 <Textarea
 id="admin-order-note"
 value={note}
 onChange={(event) => setNote(event.target.value)}
 rows={2}
 maxLength={500}
 placeholder="Adaugă o notiță pentru echipă…"
 className="flex-1 rounded-lg px-3 py-2"
 />
 <Button
 type="button"
 variant="outline"
 disabled={!canAct || note.trim().length < 3}
 onClick={() => {
 void controller
 .start({
 kind: 'note',
 orderId: order._id,
 note: note.trim(),
 })
 .then(() => setNote(''));
 }}
 className="rounded-lg"
 >
 Adaugă
 </Button>
 </div>
 </CardContent>
 </Card>

 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">Istoric</h2>
 {order.events.length === 0 ? (
 <p className="mt-2 text-sm text-muted-foreground">
 Nicio acțiune înregistrată.
 </p>
 ) : (
 <ul className="mt-3 space-y-2">
 {order.events.map((event) => (
 <li
 key={event._id}
 className="flex flex-col gap-0.5 border-b border-stone-100 dark:border-stone-800 pb-2 text-sm last:border-b-0"
 >
 <span className="font-medium text-stone-800 dark:text-stone-100 ">
 {EVENT_LABELS[event.kind]}
 </span>
 <span className="text-xs text-muted-foreground">
 {formatDate(event.createdAt)} · {userLabel(event.actorId)}
 {event.data?.toUser
 ? ` · ${userLabel(event.data.fromUser)} → ${userLabel(event.data.toUser)}`
 : ''}
 {event.data?.awb ? ` · AWB ${event.data.awb}` : ''}
 </span>
 {event.note ? (
 <span className="text-stone-600 dark:text-stone-300 ">{event.note}</span>
 ) : null}
 </li>
 ))}
 </ul>
 )}
 </CardContent>
 </Card>

 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 ">Plată</h2>
 <dl className="mt-3 grid grid-cols-1 gap-3 text-sm">
 <div>
 <dt className="font-medium text-muted-foreground">Stripe Session ID</dt>
 <dd className="mt-1 break-all font-mono text-xs text-stone-700 dark:text-stone-300 ">
 {order.stripeSessionId}
 </dd>
 </div>
 {order.stripePaymentIntentId ? (
 <div>
 <dt className="font-medium text-muted-foreground">
 Payment Intent ID
 </dt>
 <dd className="mt-1 break-all font-mono text-xs text-stone-700 dark:text-stone-300 ">
 {order.stripePaymentIntentId}
 </dd>
 </div>
 ) : null}
 {order.paymentConfirmedAt ? (
 <div>
 <dt className="font-medium text-muted-foreground">
 Plată confirmată la
 </dt>
 <dd className="text-foreground">
 {formatDate(order.paymentConfirmedAt)}
 </dd>
 </div>
 ) : null}
 </dl>
 <p className="mt-3 text-xs text-muted-foreground">
 Plata se confirmă doar din Stripe. Nu poate fi modificată manual.
 </p>
 </CardContent>
 </Card>

 {cancelOpen ? (
 <AdminDialog
 title="Anulează comanda"
 onClose={() => setCancelOpen(false)}
 >
 <form
 onSubmit={(event) => {
 event.preventDefault();
 void controller.start({
 kind: 'cancelled',
 orderId: order._id,
 reason: cancelReason.trim(),
 });
 setCancelOpen(false);
 }}
 className="space-y-4"
 >
 {order.paymentStatus === 'paid' ? (
 <Alert variant="warning">
 <AlertDescription>
 Comanda este plătită. Dacă stocul a fost alocat, va fi
 returnat automat în Atelier. Rambursarea banilor se face
 manual în Stripe — nu este procesată automat.
 </AlertDescription>
 </Alert>
 ) : (
 <Alert variant="info">
 <AlertDescription>
 Comanda nu este plătită; stocul nu va fi modificat.
 </AlertDescription>
 </Alert>
 )}
 <div>
 <Label htmlFor="cancel-reason">
 Motivul anulării (obligatoriu)
 </Label>
 <Textarea
 id="cancel-reason"
 value={cancelReason}
 onChange={(event) => setCancelReason(event.target.value)}
 rows={3}
 required
 minLength={3}
 maxLength={300}
 className="mt-1 w-full rounded-lg px-3 py-2"
 />
 </div>
 <div className="flex justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setCancelOpen(false)}
 className="rounded-lg"
 >
 Renunță
 </Button>
 <Button
 type="submit"
 variant="destructive"
 disabled={!canAct || cancelReason.trim().length < 3}
 className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700"
 >
 Anulează comanda
 </Button>
 </div>
 </form>
 </AdminDialog>
 ) : null}

 {reassignOpen ? (
 <AdminDialog
 title="Realocă comanda"
 onClose={() => setReassignOpen(false)}
 >
 <form
 onSubmit={(event) => {
 event.preventDefault();
 void controller.start({
 kind: 'reassigned',
 orderId: order._id,
 userId: reassignUser.trim(),
 });
 setReassignOpen(false);
 }}
 className="space-y-4"
 >
 <div>
 <Label htmlFor="reassign-user">
 Email sau ID utilizator (ex. coleg@exemplu.ro)
 </Label>
 <Input
 id="reassign-user"
 value={reassignUser}
 onChange={(event) => setReassignUser(event.target.value)}
 required
 className="mt-1 h-auto w-full rounded-lg px-3 py-2"
 />
 </div>
 <div className="flex justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setReassignOpen(false)}
 className="rounded-lg"
 >
 Renunță
 </Button>
 <Button variant="brand"
 type="submit"
 disabled={!canAct || reassignUser.trim().length === 0}
 className="rounded-lg"
 >
 Realocă
 </Button>
 </div>
 </form>
 </AdminDialog>
 ) : null}
 </section>
 );
};

export default OrderDetail;

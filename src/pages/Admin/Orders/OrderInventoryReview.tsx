import { useRef, useState } from 'react';
import { useConvexConnectionState, useMutation } from 'convex/react';
import { AlertTriangle } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { ProductThumb } from '../../../components/ProductThumb';
import { useProductThumbnails } from '../../../hooks/useProductThumbnails';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { inventoryError } from '../../../utils/inventory.utils';
import { withTimeout } from '../PointOfSale/pos.utils';

interface OrderInventoryReviewProps {
 order: Pick<
 Doc<'orders'>,
 | '_id'
 | 'inventoryStatus'
 | 'inventoryError'
 | 'inventoryReviewReason'
 | 'inventoryUnfulfilledItems'
 > & {
 items: {
 productId: Id<'products'>;
 name: string;
 quantity: number;
 price: number | null;
 }[];
 };
}

export const OrderInventoryReview = ({ order }: OrderInventoryReviewProps) => {
 const reconcile = useMutation(api.orders.reconcileStock);
 const thumbnails = useProductThumbnails();
 const { isWebSocketConnected: online } = useConvexConnectionState();
 const [open, setOpen] = useState(false);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const lock = useRef(false);
 if (order.inventoryStatus !== 'needs_review')
 return success ? (
 <Alert variant="success" role="status" className="rounded-xl">
 <AlertDescription>{success}</AlertDescription>
 </Alert>
 ) : null;
 return (
 <section aria-label="Inventar de verificat">
 <Alert variant="warning" className="rounded-xl p-5">
 <AlertTriangle className="h-6 w-6" />
 <AlertTitle>Plată confirmată · Stoc de verificat</AlertTitle>
 <AlertDescription>
 <p className="mt-2 leading-6">{order.inventoryError}</p>
 <p className="mt-1">
 Nu solicita clientului o nouă plată și nu expedia până la
 reconcilierea stocului.
 </p>
 </AlertDescription>
 <Button
 type="button"
 variant="outline"
 disabled={!online || busy}
 onClick={() => setOpen(true)}
 className="mt-4 min-h-11 rounded-lg border-amber-800 px-4 py-2 text-sm font-semibold text-amber-950 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
 >
 Reverifică și aplică stocul
 </Button>
 </Alert>
 {open ? (
 <AdminDialog
 title="Reconciliere stoc comandă"
 locked={busy}
 onClose={() => setOpen(false)}
 >
 <p className="mb-4 text-sm leading-6 text-stone-600 dark:text-stone-300 ">
 Confirmă aplicarea stocului pentru comanda deja plătită, după
 verificarea disponibilului online. Această operațiune nu debitează
 clientul. Se aplică doar cantitățile încă nealocate de mai jos.
 </p>
 {order.inventoryReviewReason === 'cancelled' ? (
 <Alert variant="warning" className="mb-4">
 <AlertDescription>
 Comanda a fost anulată înainte de confirmarea plății.
 Continuarea confirmă că ai verificat situația și comanda poate
 fi onorată.
 </AlertDescription>
 </Alert>
 ) : null}
 <ul className="mb-5 space-y-2 text-sm">
 {(order.inventoryUnfulfilledItems ?? order.items).map(
 (item, index) => (
 <li
 key={`${item.productId}-${index}`}
 className="flex items-center gap-2.5"
 >
 <ProductThumb
 src={thumbnails.get(item.productId)}
 alt={item.name}
 className="h-8 w-8"
 />
 <span>
 {item.quantity} × {item.name}
 </span>
 </li>
 ),
 )}
 </ul>
 {!online ? (
 <p role="status" className="mb-4 text-sm text-red-700 dark:text-red-400 ">
 Fără conexiune. Reconcilierea este blocată până la reconectare.
 </p>
 ) : null}
 {error ? (
 <Alert variant="destructive" className="mb-4">
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 ) : null}
 <Button
 type="button"
 disabled={busy || !online}
 onClick={async () => {
 if (lock.current || !online) return;
 lock.current = true;
 setBusy(true);
 setError('');
 try {
 const result = await withTimeout(
 reconcile({ orderId: order._id }),
 );
 if (result.inventoryStatus === 'applied') {
 setSuccess(
 'Stocul comenzii a fost aplicat. Plata nu a fost repetată.',
 );
 setOpen(false);
 } else
 setError(
 'Stocul nu este încă suficient. Verifică disponibilul și încearcă aceeași comandă după realimentare.',
 );
 } catch (cause) {
 setError(inventoryError(cause));
 } finally {
 lock.current = false;
 setBusy(false);
 }
 }}
 className="min-h-12 w-full rounded-xl bg-amber-800 px-4 py-3 font-semibold hover:bg-amber-900 disabled:opacity-40"
 >
 {busy
 ? 'Se verifică salvarea...'
 : 'Aplică stocul comenzii plătite'}
 </Button>
 </AdminDialog>
 ) : null}
 </section>
 );
};

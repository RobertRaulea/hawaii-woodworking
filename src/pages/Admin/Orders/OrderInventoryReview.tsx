import { useRef, useState } from 'react';
import { useConvexConnectionState, useMutation } from 'convex/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
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
  const { isWebSocketConnected: online } = useConvexConnectionState();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const lock = useRef(false);
  if (order.inventoryStatus !== 'needs_review')
    return success ? (
      <p
        role="status"
        className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"
      >
        {success}
      </p>
    ) : null;
  return (
    <section
      className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950"
      aria-label="Inventar de verificat"
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
        <div>
          <h2 className="font-semibold">
            Plată confirmată · Stoc de verificat
          </h2>
          <p className="mt-2 text-sm leading-6">{order.inventoryError}</p>
          <p className="mt-1 text-sm">
            Nu solicita clientului o nouă plată și nu expedia până la
            reconcilierea stocului.
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={!online || busy}
        onClick={() => setOpen(true)}
        className="ml-9 mt-4 min-h-11 rounded-lg border border-amber-800 px-4 py-2 text-sm font-semibold disabled:opacity-40"
      >
        Reverifică și aplică stocul
      </button>
      {open ? (
        <AdminDialog
          title="Reconciliere stoc comandă"
          locked={busy}
          onClose={() => setOpen(false)}
        >
          <p className="mb-4 text-sm leading-6 text-stone-600">
            Confirmă aplicarea stocului pentru comanda deja plătită, după
            verificarea disponibilului online. Această operațiune nu debitează
            clientul. Se aplică doar cantitățile încă nealocate de mai jos.
          </p>
          {order.inventoryReviewReason === 'cancelled' ? (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
            >
              Comanda a fost anulată înainte de confirmarea plății. Continuarea
              confirmă că ai verificat situația și comanda poate fi onorată.
            </p>
          ) : null}
          <ul className="mb-5 space-y-2 text-sm">
            {(order.inventoryUnfulfilledItems ?? order.items).map(
              (item, index) => (
                <li key={`${item.productId}-${index}`}>
                  {item.quantity} × {item.name}
                </li>
              ),
            )}
          </ul>
          {!online ? (
            <p role="status" className="mb-4 text-sm text-red-700">
              Fără conexiune. Reconcilierea este blocată până la reconectare.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mb-4 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
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
            className="min-h-12 w-full rounded-xl bg-amber-800 px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {busy
              ? 'Se verifică salvarea...'
              : 'Aplică stocul comenzii plătite'}
          </button>
        </AdminDialog>
      ) : null}
    </section>
  );
};

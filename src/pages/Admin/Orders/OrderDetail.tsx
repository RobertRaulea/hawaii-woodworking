import type React from 'react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { useStaffDirectory } from '../../../hooks/useStaffDirectory';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { useOrderAction } from '../../../hooks/useOrderAction';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { OrderInventoryReview } from './OrderInventoryReview';
import type { OrderAdminEvent } from '../../../types/orders.types';

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Neplătită',
  paid: 'Plătită',
  cancelled: 'Anulată',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
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
      <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
        {orderError}
      </p>
    );
  }

  if (order === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Se încarcă comanda…</p>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-stone-500">Comanda nu a fost găsită.</p>
        <Link
          to="/admin/orders"
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
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
          className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 transition-colors hover:text-stone-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Înapoi la Comenzi
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-stone-900">
            Comanda #{order.shortNumber}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${PAYMENT_COLORS[order.paymentStatus]}`}
            >
              {manualRefund
                ? 'Plătită — rambursare manuală necesară'
                : PAYMENT_LABELS[order.paymentStatus]}
            </span>
            <span className="inline-block rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-700">
              {FULFILLMENT_LABELS[order.fulfillmentState]}
            </span>
          </div>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          {formatDate(order.createdAt)}
        </p>
      </div>

      {controller.error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          <p>{controller.error}</p>
          {controller.pending ? (
            <button
              type="button"
              onClick={() => void controller.retry()}
              disabled={controller.busy || !controller.online}
              className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 font-medium disabled:opacity-50"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reîncearcă
            </button>
          ) : null}
        </div>
      ) : null}

      <OrderInventoryReview order={order} />

      {order.customer ? (
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-stone-800">Client</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-stone-500">Nume</p>
              <p className="text-sm text-stone-900">
                {order.customer.firstName} {order.customer.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Email</p>
              <p className="text-sm text-stone-900">{order.customer.email}</p>
            </div>
            {order.shipping ? (
              <div>
                <p className="text-sm font-medium text-stone-500">
                  Adresă de livrare (
                  {order.shippingSource === 'snapshot'
                    ? 'din comandă'
                    : 'din fișa clientului'}
                  )
                </p>
                <p className="text-sm text-stone-900">
                  {order.shipping.firstName} {order.shipping.lastName}
                </p>
                <p className="text-sm text-stone-700">
                  {order.shipping.address.street}
                </p>
                <p className="text-sm text-stone-700">
                  {order.shipping.address.city},{' '}
                  {order.shipping.address.county}{' '}
                  {order.shipping.address.postalCode}
                </p>
                <p className="text-sm text-stone-700">
                  {order.shipping.address.country}
                </p>
              </div>
            ) : null}
            {order.customer.billingAddress ? (
              <div>
                <p className="text-sm font-medium text-stone-500">
                  Adresă de facturare
                </p>
                <p className="text-sm text-stone-900">
                  {order.customer.billingAddress.street}
                </p>
                <p className="text-sm text-stone-700">
                  {order.customer.billingAddress.city},{' '}
                  {order.customer.billingAddress.county}{' '}
                  {order.customer.billingAddress.postalCode}
                </p>
                <p className="text-sm text-stone-700">
                  {order.customer.billingAddress.country}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-stone-800">Produse</h2>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="pb-2 text-left font-medium text-stone-600">
                  Produs
                </th>
                <th className="pb-2 text-right font-medium text-stone-600">
                  Preț
                </th>
                <th className="pb-2 text-right font-medium text-stone-600">
                  Cantitate
                </th>
                <th className="pb-2 text-right font-medium text-stone-600">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr
                  key={`${item.productId}-${index}`}
                  className="border-b border-stone-100 last:border-b-0"
                >
                  <td className="py-3 text-stone-900">{item.name}</td>
                  <td className="py-3 text-right text-stone-700">
                    {formatPrice(item.price ?? 0)}
                  </td>
                  <td className="py-3 text-right text-stone-700">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-right font-medium text-stone-900">
                    {formatPrice((item.price ?? 0) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-200">
                <td
                  colSpan={3}
                  className="pt-3 text-right font-semibold text-stone-800"
                >
                  Total
                </td>
                <td className="pt-3 text-right text-base font-bold text-stone-900">
                  {formatPrice(order.total ?? 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-stone-800">
          Pregătire și expediere
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="font-medium text-stone-500">Operator</dt>
            <dd className="text-stone-900">
              {order.assignedTo ? userLabel(order.assignedTo) : 'Nealocată'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-stone-500">Expediere</dt>
            <dd className="text-stone-900">
              {order.carrier || order.awb
                ? `${order.carrier ?? '—'} · AWB ${order.awb ?? '—'}`
                : 'Neexpediată'}
            </dd>
          </div>
          {order.shippedAt ? (
            <div>
              <dt className="font-medium text-stone-500">Expediată la</dt>
              <dd className="text-stone-900">
                {formatDate(order.shippedAt)}
              </dd>
            </div>
          ) : null}
          {order.deliveredAt ? (
            <div>
              <dt className="font-medium text-stone-500">Livrată la</dt>
              <dd className="text-stone-900">
                {formatDate(order.deliveredAt)}
              </dd>
            </div>
          ) : null}
          {order.cancelReason ? (
            <div className="md:col-span-2">
              <dt className="font-medium text-stone-500">Motiv anulare</dt>
              <dd className="text-stone-900">{order.cancelReason}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {order.fulfillmentState !== 'cancelled' ? (
            <Link
              to={`/admin/fulfillment/${order._id}`}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Deschide în pregătire comenzi
            </Link>
          ) : null}
          {reassignable ? (
            <button
              type="button"
              disabled={!canAct}
              onClick={() => setReassignOpen(true)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              Realocă
            </button>
          ) : null}
          {cancellable ? (
            <button
              type="button"
              disabled={!canAct}
              onClick={() => setCancelOpen(true)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Anulează comanda
            </button>
          ) : null}
          {order.invoicePdfUrl ? (
            <a
              href={order.invoicePdfUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Deschide factura
            </a>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-stone-800">Notițe</h2>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <label className="sr-only" htmlFor="admin-order-note">
            Notiță nouă
          </label>
          <textarea
            id="admin-order-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Adaugă o notiță pentru echipă…"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
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
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Adaugă
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-stone-800">Istoric</h2>
        {order.events.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">
            Nicio acțiune înregistrată.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {order.events.map((event) => (
              <li
                key={event._id}
                className="flex flex-col gap-0.5 border-b border-stone-100 pb-2 text-sm last:border-b-0"
              >
                <span className="font-medium text-stone-800">
                  {EVENT_LABELS[event.kind]}
                </span>
                <span className="text-xs text-stone-500">
                  {formatDate(event.createdAt)} · {userLabel(event.actorId)}
                  {event.data?.toUser
                    ? ` · ${userLabel(event.data.fromUser)} → ${userLabel(event.data.toUser)}`
                    : ''}
                  {event.data?.awb ? ` · AWB ${event.data.awb}` : ''}
                </span>
                {event.note ? (
                  <span className="text-stone-600">{event.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-stone-800">Plată</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm">
          <div>
            <dt className="font-medium text-stone-500">Stripe Session ID</dt>
            <dd className="mt-1 break-all font-mono text-xs text-stone-700">
              {order.stripeSessionId}
            </dd>
          </div>
          {order.stripePaymentIntentId ? (
            <div>
              <dt className="font-medium text-stone-500">
                Payment Intent ID
              </dt>
              <dd className="mt-1 break-all font-mono text-xs text-stone-700">
                {order.stripePaymentIntentId}
              </dd>
            </div>
          ) : null}
          {order.paymentConfirmedAt ? (
            <div>
              <dt className="font-medium text-stone-500">
                Plată confirmată la
              </dt>
              <dd className="text-stone-900">
                {formatDate(order.paymentConfirmedAt)}
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-3 text-xs text-stone-500">
          Plata se confirmă doar din Stripe. Nu poate fi modificată manual.
        </p>
      </div>

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
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Comanda este plătită. Dacă stocul a fost alocat, va fi
                returnat automat în Atelier. Rambursarea banilor se face
                manual în Stripe — nu este procesată automat.
              </p>
            ) : (
              <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-700">
                Comanda nu este plătită; stocul nu va fi modificat.
              </p>
            )}
            <div>
              <label
                htmlFor="cancel-reason"
                className="text-sm font-medium text-stone-700"
              >
                Motivul anulării (obligatoriu)
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={3}
                required
                minLength={3}
                maxLength={300}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Renunță
              </button>
              <button
                type="submit"
                disabled={!canAct || cancelReason.trim().length < 3}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Anulează comanda
              </button>
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
              <label
                htmlFor="reassign-user"
                className="text-sm font-medium text-stone-700"
              >
                Email sau ID utilizator (ex. coleg@exemplu.ro)
              </label>
              <input
                id="reassign-user"
                value={reassignUser}
                onChange={(event) => setReassignUser(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReassignOpen(false)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Renunță
              </button>
              <button
                type="submit"
                disabled={!canAct || reassignUser.trim().length === 0}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Realocă
              </button>
            </div>
          </form>
        </AdminDialog>
      ) : null}
    </section>
  );
};

export default OrderDetail;

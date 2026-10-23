import type React from 'react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  PrinterIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { useStaffDirectory } from '../../../hooks/useStaffDirectory';
import { useOrderAction } from '../../../hooks/useOrderAction';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { STATE_LABELS } from './fulfillmentLabels';
import type { FulfillmentEvent } from '../../../types/orders.types';

const EVENT_LABELS: Record<FulfillmentEvent['kind'], string> = {
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

export const FulfillmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { can, userId } = useStaffAccess();
  const userLabel = useStaffDirectory();
  const isAdmin = can('orders.manage');
  const controller = useOrderAction(userId);
  const order = useQuery(
    api.fulfillment.get,
    id ? { orderId: id as Id<'orders'> } : 'skip',
  );
  const [note, setNote] = useState('');
  const [shipOpen, setShipOpen] = useState(false);
  const [awb, setAwb] = useState('');
  const [carrier, setCarrier] = useState('');

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
        <p className="mb-4 text-stone-500">
          Comanda nu este în fluxul de pregătire comenzi.
        </p>
        <Link
          to="/admin/fulfillment"
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          ← Înapoi la pregătire comenzi
        </Link>
      </div>
    );
  }

  const heldByOther =
    Boolean(order.assignedTo) && !order.assignedToMe && !isAdmin;
  const canAct = !controller.busy && !controller.blocked && controller.online;
  const allChecked =
    order.checklist.length > 0 &&
    order.checklist.every((line) => line.checked);
  const quantityOf = (productId: Id<'products'>) =>
    order.items.find((item) => item.productId === productId)?.quantity ?? 0;
  // Checklist quantities are rendered from order.items; quantityOf maps a
  // checklist productId back to the ordered quantity when needed.

  return (
    <section className="max-w-4xl space-y-6">
      <div>
        <Link
          to="/admin/fulfillment"
          className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 transition-colors hover:text-stone-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Înapoi la pregătire comenzi
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-stone-900">
            Comanda #{order.shortNumber}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-500">
              {STATE_LABELS[order.state]}
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <PrinterIcon className="h-4 w-4" />
              Printează lista
            </button>
            {order.invoicePdfUrl ? (
              <a
                href={order.invoicePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Deschide factura
              </a>
            ) : null}
          </div>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          {formatDate(order.createdAt)}
        </p>
      </div>

      {order.assignedTo ? (
        <p className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          <UserIcon className="h-4 w-4" />
          Comanda este preluată de{' '}
          {order.assignedToMe ? 'tine' : userLabel(order.assignedTo)}.
        </p>
      ) : null}

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

      {order.recipient ? (
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-stone-800">Destinatar</h2>
          <p className="mt-2 text-sm text-stone-900">
            {order.recipient.firstName} {order.recipient.lastName}
          </p>
          <p className="text-sm text-stone-700">
            {order.recipient.address.street}
          </p>
          <p className="text-sm text-stone-700">
            {order.recipient.address.city}, {order.recipient.address.county}{' '}
            {order.recipient.address.postalCode}
          </p>
          <p className="text-sm text-stone-700">
            {order.recipient.address.country}
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-stone-800">
          Lista de verificare
        </h2>
        <ul className="mt-3 space-y-2">
          {(order.checklist.length > 0
            ? order.checklist.map((line) => ({
                productId: line.productId,
                checked: line.checked,
                name:
                  order.items.find(
                    (item) => item.productId === line.productId,
                  )?.name ?? line.productId,
                quantity: quantityOf(line.productId),
              }))
            : order.items.map((item) => ({
                productId: item.productId,
                checked: false,
                name: item.name,
                quantity: item.quantity,
              }))
          ).map((line) => {
            const editable =
              order.state === 'preparing' &&
              (order.assignedToMe || isAdmin) &&
              canAct;
            return (
              <li key={line.productId}>
                <label
                  className={`flex items-center gap-3 rounded-lg border border-stone-200 p-3 ${
                    editable ? 'cursor-pointer' : 'opacity-80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={line.checked}
                    disabled={!editable}
                    onChange={(event) =>
                      void controller.start({
                        kind: 'checked',
                        orderId: order._id,
                        productId: line.productId,
                        checked: event.target.checked,
                      })
                    }
                    className="h-5 w-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="flex-1 text-sm text-stone-900">
                    {line.name}
                  </span>
                  <span className="text-sm text-stone-500">
                    × {line.quantity}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {order.checklist.length === 0 ? (
          <p className="mt-2 text-xs text-stone-500">
            Checklistul se inițializează la preluarea comenzii.
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-stone-800">Acțiuni</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {order.state === 'ready' ? (
            <button
              type="button"
              disabled={!canAct}
              onClick={() =>
                void controller.start({
                  kind: 'claimed',
                  orderId: order._id,
                })
              }
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Preia
            </button>
          ) : null}
          {order.state === 'preparing' ? (
            <>
              <button
                type="button"
                disabled={!canAct || heldByOther}
                onClick={() =>
                  void controller.start({
                    kind: 'released',
                    orderId: order._id,
                  })
                }
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Eliberează
              </button>
              <button
                type="button"
                disabled={!canAct || heldByOther || !allChecked}
                title={
                  !allChecked
                    ? 'Bifează toate produsele înainte de ambalare.'
                    : undefined
                }
                onClick={() =>
                  void controller.start({
                    kind: 'packed',
                    orderId: order._id,
                  })
                }
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Marchează ambalată
              </button>
            </>
          ) : null}
          {order.state === 'packed' ? (
            <button
              type="button"
              disabled={!canAct || heldByOther}
              onClick={() => setShipOpen(true)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Expediază
            </button>
          ) : null}
          {order.state === 'shipped' ? (
            <button
              type="button"
              disabled={!canAct || heldByOther}
              onClick={() =>
                void controller.start({
                  kind: 'delivered',
                  orderId: order._id,
                })
              }
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Marchează livrată
            </button>
          ) : null}
          {order.state !== 'ready' &&
          !order.assignedToMe &&
          !isAdmin &&
          order.assignedTo ? (
            <p className="text-sm text-stone-500">
              Acțiunile sunt disponibile doar operatorului care a preluat
              comanda.
            </p>
          ) : null}
        </div>
        {order.awb || order.carrier ? (
          <p className="mt-3 text-sm text-stone-600">
            {order.carrier ? `Curier: ${order.carrier}` : ''}
            {order.carrier && order.awb ? ' · ' : ''}
            {order.awb ? `AWB: ${order.awb}` : ''}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-stone-800">Notițe</h2>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <label className="sr-only" htmlFor="order-note">
            Notiță nouă
          </label>
          <textarea
            id="order-note"
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
                  {event.data?.productId
                    ? ` · ${
                        order.items.find(
                          (item) => item.productId === event.data?.productId,
                        )?.name ?? event.data.productId
                      }`
                    : ''}
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

      {shipOpen ? (
        <AdminDialog
          title="Expediază comanda"
          onClose={() => setShipOpen(false)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void controller.start({
                kind: 'shipped',
                orderId: order._id,
                awb: awb.trim() || undefined,
                carrier: carrier.trim() || undefined,
              });
              setShipOpen(false);
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="ship-awb"
                className="text-sm font-medium text-stone-700"
              >
                AWB (opțional)
              </label>
              <input
                id="ship-awb"
                value={awb}
                onChange={(event) => setAwb(event.target.value)}
                placeholder="ex. AWB-12345"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label
                htmlFor="ship-carrier"
                className="text-sm font-medium text-stone-700"
              >
                Curier (opțional)
              </label>
              <input
                id="ship-carrier"
                value={carrier}
                onChange={(event) => setCarrier(event.target.value)}
                placeholder="ex. FAN Courier"
                maxLength={50}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShipOpen(false)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Renunță
              </button>
              <button
                type="submit"
                disabled={!canAct}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Expediază
              </button>
            </div>
          </form>
        </AdminDialog>
      ) : null}
    </section>
  );
};

export default FulfillmentDetail;

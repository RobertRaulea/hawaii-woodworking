import type React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import {
  ArrowPathIcon,
  InboxArrowDownIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { useStaffDirectory } from '../../../hooks/useStaffDirectory';
import { useOrderAction } from '../../../hooks/useOrderAction';
import type { FulfillmentQueueItem } from '../../../types/orders.types';
import { STATE_LABELS } from './fulfillmentLabels';

type Tab = 'ready' | 'preparing' | 'packed' | 'shipped';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ready', label: 'De pregătit' },
  { key: 'preparing', label: 'În pregătire' },
  { key: 'packed', label: 'Ambalate' },
  { key: 'shipped', label: 'Expediate recent' },
];

const STATE_COLORS: Record<string, string> = {
  ready: 'bg-amber-100 text-amber-800',
  preparing: 'bg-blue-100 text-blue-800',
  packed: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  blocked: 'bg-stone-200 text-stone-600',
};

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const FulfillmentQueue: React.FC = () => {
  const { userId, can } = useStaffAccess();
  const userLabel = useStaffDirectory();
  const controller = useOrderAction(userId);
  const orders = useQuery(api.fulfillment.queue, {});
  const restock = useQuery(
    api.transfers.list,
    can('transfers.view') ? { status: 'requested' as const } : 'skip',
  );
  const [tab, setTab] = useState<Tab>('ready');

  if (orders === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Se încarcă comenzile…</p>
      </div>
    );
  }

  const rows = orders.filter((order) => order.state === tab);

  const claim = (order: FulfillmentQueueItem) => {
    void controller.start({ kind: 'claimed', orderId: order._id });
  };

  return (
    <section className="max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Pregătire comenzi</h1>
        <p className="mt-1 text-sm text-stone-500">
          Pregătirea, ambalarea și expedierea comenzilor plătite.
        </p>
      </header>

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

      <div
        role="tablist"
        aria-label="Stare pregătire comenzi"
        className="flex flex-wrap gap-2"
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-amber-600 text-white'
                : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
          Nicio comandă în această stare.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((order) => (
            <li
              key={order._id}
              className="rounded-lg border border-stone-200 bg-white p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/admin/fulfillment/${order._id}`}
                      className="font-semibold text-stone-900 hover:text-amber-700"
                    >
                      #{order.shortNumber}
                    </Link>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_COLORS[order.state]}`}
                    >
                      {STATE_LABELS[order.state]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {formatDate(order.createdAt)} · {order.itemCount}{' '}
                    produse · {order.units} bucăți
                    {order.assignedTo
                      ? ` · la ${userLabel(order.assignedTo)}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {order.state === 'ready' ? (
                    <button
                      type="button"
                      onClick={() => claim(order)}
                      disabled={
                        controller.busy ||
                        controller.blocked ||
                        !controller.online
                      }
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Preia
                    </button>
                  ) : null}
                  <Link
                    to={`/admin/fulfillment/${order._id}`}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Deschide
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section
        aria-label="Solicitări de reaprovizionare"
        className="rounded-lg border border-stone-200 bg-white p-5"
      >
        <div className="flex items-center gap-2">
          <InboxArrowDownIcon className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-stone-800">
            Solicitări de reaprovizionare
          </h2>
        </div>
        {restock === undefined ? (
          <p className="mt-3 text-sm text-stone-500">Se încarcă…</p>
        ) : restock.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            Nicio solicitare în așteptare.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {restock.map((transfer) => (
              <li key={transfer._id}>
                <Link
                  to={`/admin/transfers/${transfer._id}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  <TruckIcon className="h-4 w-4" />
                  Transfer #{transfer._id.slice(-8).toUpperCase()} ·{' '}
                  {transfer.lineCount} produse · {transfer.totalUnits} bucăți
                  → {transfer.toName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
};

export default FulfillmentQueue;

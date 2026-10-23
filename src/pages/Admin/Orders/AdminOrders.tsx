import type React from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon } from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { InventoryReviewSummary } from './InventoryReviewSummary';
import type { OrderAdminRow } from '../../../types/orders.types';

const PAGE_SIZE = 25;

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

const FULFILLMENT_COLORS: Record<string, string> = {
  ready: 'bg-amber-100 text-amber-800',
  preparing: 'bg-blue-100 text-blue-800',
  packed: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  blocked: 'bg-stone-200 text-stone-600',
  cancelled: 'bg-red-100 text-red-800',
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
      <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
        {error}
      </p>
    );
  }

  if (orders === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Se încarcă comenzile…</p>
      </div>
    );
  }

  return (
    <section className="max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Comenzi</h1>
        <p className="mt-1 text-sm text-stone-500">
          Toate comenzile online, cu starea plății și a pregătirii.
        </p>
      </header>

      <InventoryReviewSummary />

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-stone-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label
            htmlFor="order-search"
            className="text-xs font-medium text-stone-600"
          >
            Caută
          </label>
          <input
            id="order-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            placeholder="Număr comandă, client, email sau sesiune Stripe"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label
            htmlFor="orders-from"
            className="text-xs font-medium text-stone-600"
          >
            De la
          </label>
          <input
            id="orders-from"
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              resetPage();
            }}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label
            htmlFor="orders-to"
            className="text-xs font-medium text-stone-600"
          >
            Până la
          </label>
          <input
            id="orders-to"
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value);
              resetPage();
            }}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div>
            <label
              htmlFor="payment-filter"
              className="text-xs font-medium text-stone-600"
            >
              Stare plată
            </label>
            <select
              id="payment-filter"
              value={paymentFilter}
              onChange={(event) => {
                setPaymentFilter(event.target.value);
                resetPage();
              }}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Toate</option>
              <option value="pending">Neplătită</option>
              <option value="paid">Plătită</option>
              <option value="cancelled">Anulată</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="fulfillment-filter"
              className="text-xs font-medium text-stone-600"
            >
              Stare pregătire
            </label>
            <select
              id="fulfillment-filter"
              value={fulfillmentFilter}
              onChange={(event) => {
                setFulfillmentFilter(event.target.value);
                resetPage();
              }}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
        <p className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
          Nicio comandă nu corespunde filtrelor.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th className="px-4 py-3 font-medium text-stone-600">
                  Comandă
                </th>
                <th className="px-4 py-3 font-medium text-stone-600">
                  Client
                </th>
                <th className="px-4 py-3 font-medium text-stone-600">
                  Data
                </th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">
                  Produse
                </th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">
                  Total
                </th>
                <th className="px-4 py-3 font-medium text-stone-600">
                  Plată
                </th>
                <th className="px-4 py-3 font-medium text-stone-600">
                  Pregătire
                </th>
                <th className="px-4 py-3 font-medium text-stone-600">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((order) => (
                <tr
                  key={order._id}
                  className="border-b border-stone-100 last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium text-stone-900">
                    #{order.shortNumber}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {order.customer
                      ? `${order.customer.firstName} ${order.customer.lastName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {order.itemCount}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-stone-900">
                    {formatPrice(order.total ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_COLORS[order.paymentStatus]}`}
                    >
                      {order.paymentStatus === 'paid' &&
                      order.status === 'cancelled'
                        ? 'Plătită — rambursare manuală necesară'
                        : PAYMENT_LABELS[order.paymentStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${FULFILLMENT_COLORS[order.fulfillmentState]}`}
                    >
                      {FULFILLMENT_LABELS[order.fulfillmentState]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/orders/${order._id}`}
                      aria-label={`Deschide comanda ${order.shortNumber}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800"
                    >
                      <EyeIcon className="h-4 w-4" />
                      Deschide
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Paginare comenzi"
          className="flex items-center justify-between"
        >
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Înapoi
          </button>
          <p className="text-sm text-stone-600">
            Pagina {currentPage} din {pageCount}
          </p>
          <button
            type="button"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= pageCount}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Înainte
          </button>
        </nav>
      ) : null}
    </section>
  );
};

export default AdminOrders;

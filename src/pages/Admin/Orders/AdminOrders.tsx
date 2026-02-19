import type React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ShoppingBag, Eye } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

type StatusFilter = 'all' | OrderStatus;

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPrice = (price: number): string => `${price.toFixed(2)} RON`;

const getTodayRange = (): { start: number; end: number } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 24 * 60 * 60 * 1000 - 1;
  return { start, end };
};

export const AdminOrders: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const allOrders = useQuery(api.orders.getAll);

  const { start: todayStart, end: todayEnd } = getTodayRange();
  const todayOrders = useQuery(api.orders.getByDateRange, {
    startTime: todayStart,
    endTime: todayEnd,
  });

  if (allOrders === undefined || todayOrders === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading orders...</p>
      </div>
    );
  }

  const filteredOrders =
    statusFilter === 'all'
      ? allOrders
      : allOrders.filter((o) => o.status === statusFilter);

  const todayTotal = todayOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <section className="space-y-8">
      {/* Today's Summary */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 mb-4">Orders</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-stone-200 p-5">
            <p className="text-sm text-stone-500 mb-1">Today&apos;s Orders</p>
            <p className="text-2xl font-bold text-stone-900">{todayOrders.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-stone-200 p-5">
            <p className="text-sm text-stone-500 mb-1">Today&apos;s Revenue</p>
            <p className="text-2xl font-bold text-stone-900">{formatPrice(todayTotal)}</p>
          </div>
          <div className="bg-white rounded-lg border border-stone-200 p-5">
            <p className="text-sm text-stone-500 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-stone-900">{allOrders.length}</p>
          </div>
        </div>
      </div>

      {/* Today's Orders */}
      {todayOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-3">Today&apos;s Orders</h2>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-4 py-3 text-left font-medium text-stone-600">Order</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-600">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-600 hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-600">Total</th>
                  <th className="px-4 py-3 text-center font-medium text-stone-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {todayOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">
                      {order._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-900">
                      {order.customer
                        ? `${order.customer.firstName} ${order.customer.lastName}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 hidden md:table-cell">
                      {order.customer?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-700">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status as OrderStatus]}`}
                      >
                        {STATUS_LABELS[order.status as OrderStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/orders/${order._id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order History */}
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-stone-800">Order History</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="statusFilter" className="text-sm text-stone-500">
              Filter:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-12 text-center">
            <ShoppingBag className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-4 py-3 text-left font-medium text-stone-600">Order</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-600">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-600 hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-600">Total</th>
                  <th className="px-4 py-3 text-center font-medium text-stone-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-600 hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">
                      {order._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-900">
                      {order.customer
                        ? `${order.customer.firstName} ${order.customer.lastName}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 hidden md:table-cell">
                      {order.customer?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-700">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status as OrderStatus]}`}
                      >
                        {STATUS_LABELS[order.status as OrderStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 hidden lg:table-cell">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/orders/${order._id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminOrders;

import type React from 'react';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

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

const ALL_STATUSES: OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

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

interface AddressDisplayProps {
  label: string;
  address: {
    street: string;
    city: string;
    county: string;
    postalCode: string;
    country: string;
  };
}

const AddressDisplay: React.FC<AddressDisplayProps> = ({ label, address }) => (
  <div>
    <h4 className="text-sm font-medium text-stone-500 mb-1">{label}</h4>
    <p className="text-sm text-stone-900">{address.street}</p>
    <p className="text-sm text-stone-900">
      {address.city}, {address.county} {address.postalCode}
    </p>
    <p className="text-sm text-stone-900">{address.country}</p>
  </div>
);

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const order = useQuery(
    api.orders.getById,
    id ? { orderId: id as Id<'orders'> } : 'skip'
  );
  const updateStatus = useMutation(api.orders.updateStatus);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (order === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading order...</p>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500 mb-4">Order not found.</p>
        <Link
          to="/admin/orders"
          className="text-amber-600 hover:text-amber-700 font-medium text-sm"
        >
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setUpdatingStatus(true);
    try {
      await updateStatus({
        orderId: order._id,
        status: newStatus,
      });
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <section className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">
            Order #{order._id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm text-stone-500 mt-1">{formatDate(order.createdAt)}</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[order.status as OrderStatus]}`}
          >
            {STATUS_LABELS[order.status as OrderStatus]}
          </span>
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
            disabled={updatingStatus}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer Info */}
      {order.customer && (
        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h3 className="text-lg font-semibold text-stone-800 mb-4">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-stone-500 mb-1">Name</h4>
              <p className="text-sm text-stone-900">
                {order.customer.firstName} {order.customer.lastName}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-stone-500 mb-1">Email</h4>
              <p className="text-sm text-stone-900">{order.customer.email}</p>
            </div>
            <AddressDisplay label="Shipping Address" address={order.customer.shippingAddress} />
            <AddressDisplay label="Billing Address" address={order.customer.billingAddress} />
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white rounded-lg border border-stone-200 p-5">
        <h3 className="text-lg font-semibold text-stone-800 mb-4">Order Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="pb-2 text-left font-medium text-stone-600">Product</th>
                <th className="pb-2 text-right font-medium text-stone-600">Price</th>
                <th className="pb-2 text-right font-medium text-stone-600">Qty</th>
                <th className="pb-2 text-right font-medium text-stone-600">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr
                  key={`${item.productId}-${index}`}
                  className="border-b border-stone-100 last:border-b-0"
                >
                  <td className="py-3 text-stone-900">{item.name}</td>
                  <td className="py-3 text-right text-stone-700">{formatPrice(item.price)}</td>
                  <td className="py-3 text-right text-stone-700">{item.quantity}</td>
                  <td className="py-3 text-right font-medium text-stone-900">
                    {formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-200">
                <td colSpan={3} className="pt-3 text-right font-semibold text-stone-800">
                  Total
                </td>
                <td className="pt-3 text-right font-bold text-stone-900 text-base">
                  {formatPrice(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Stripe Info */}
      <div className="bg-white rounded-lg border border-stone-200 p-5">
        <h3 className="text-lg font-semibold text-stone-800 mb-4">Payment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-stone-500">Stripe Session ID:</span>
            <p className="font-mono text-xs text-stone-700 mt-1 break-all">
              {order.stripeSessionId}
            </p>
          </div>
          {order.stripePaymentIntentId && (
            <div>
              <span className="text-stone-500">Payment Intent ID:</span>
              <p className="font-mono text-xs text-stone-700 mt-1 break-all">
                {order.stripePaymentIntentId}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default OrderDetail;

import type React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ArrowLeft, Eye, ExternalLink } from 'lucide-react';
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

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const customer = useQuery(
    api.customers.getById,
    id ? { customerId: id as Id<'customers'> } : 'skip'
  );

  if (customer === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading customer...</p>
      </div>
    );
  }

  if (customer === null) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500 mb-4">Customer not found.</p>
        <Link
          to="/admin/customers"
          className="text-amber-600 hover:text-amber-700 font-medium text-sm"
        >
          ← Back to Customers
        </Link>
      </div>
    );
  }

  const totalSpent = customer.orders
    .filter((o: { status: string }) => o.status !== 'cancelled')
    .reduce((sum: number, o: { total: number }) => sum + o.total, 0);

  return (
    <section className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/admin/customers"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-2 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">
              {customer.firstName} {customer.lastName}
            </h1>
            <p className="text-sm text-stone-500 mt-1">{customer.email}</p>
          </div>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium self-start ${
              customer.isRegistered
                ? 'bg-blue-100 text-blue-800'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {customer.isRegistered ? 'Registered' : 'Guest'}
          </span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-lg border border-stone-200 p-5">
        <h3 className="text-lg font-semibold text-stone-800 mb-4">Customer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-stone-500 mb-1">Member Since</h4>
            <p className="text-sm text-stone-900">{formatDate(customer.createdAt)}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-stone-500 mb-1">Newsletter</h4>
            <p className="text-sm text-stone-900">{customer.newsletter ? 'Subscribed' : 'Not subscribed'}</p>
          </div>
          <AddressDisplay label="Shipping Address" address={customer.shippingAddress} />
          <AddressDisplay label="Billing Address" address={customer.billingAddress} />
          {customer.stripeCustomerId && (
            <div>
              <h4 className="text-sm font-medium text-stone-500 mb-1">Stripe Customer</h4>
              <a
                href={`https://dashboard.stripe.com/test/customers/${customer.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-mono"
              >
                {customer.stripeCustomerId}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          {customer.clerkUserId && (
            <div>
              <h4 className="text-sm font-medium text-stone-500 mb-1">Clerk User ID</h4>
              <p className="text-sm font-mono text-stone-700">{customer.clerkUserId}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <p className="text-sm text-stone-500 mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-stone-900">{customer.orders.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <p className="text-sm text-stone-500 mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-stone-900">{formatPrice(totalSpent)}</p>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white rounded-lg border border-stone-200 p-5">
        <h3 className="text-lg font-semibold text-stone-800 mb-4">Order History</h3>
        {customer.orders.length === 0 ? (
          <p className="text-stone-500 text-sm">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="pb-2 text-left font-medium text-stone-600">Order</th>
                  <th className="pb-2 text-right font-medium text-stone-600">Total</th>
                  <th className="pb-2 text-center font-medium text-stone-600">Status</th>
                  <th className="pb-2 text-left font-medium text-stone-600 hidden md:table-cell">Date</th>
                  <th className="pb-2 text-right font-medium text-stone-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order: { _id: string; total: number; status: string; createdAt: number }) => (
                  <tr
                    key={order._id}
                    className="border-b border-stone-100 last:border-b-0"
                  >
                    <td className="py-3 font-mono text-xs text-stone-500">
                      {order._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3 text-right text-stone-700">
                      {formatPrice(order.total)}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status as OrderStatus]}`}
                      >
                        {STATUS_LABELS[order.status as OrderStatus]}
                      </span>
                    </td>
                    <td className="py-3 text-stone-500 hidden md:table-cell">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-3 text-right">
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

export default CustomerDetail;

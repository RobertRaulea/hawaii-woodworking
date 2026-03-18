import type React from 'react';
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { ArrowLeft, Eye, ExternalLink, Edit, Trash2, X, Save } from 'lucide-react';
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

interface EditFormData {
  email: string;
  firstName: string;
  lastName: string;
  shippingAddress: {
    street: string;
    city: string;
    county: string;
    postalCode: string;
    country: string;
  };
  billingAddress: {
    street: string;
    city: string;
    county: string;
    postalCode: string;
    country: string;
  };
  newsletter: boolean;
}

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const customer = useQuery(
    api.customers.getById,
    id ? { customerId: id as Id<'customers'> } : 'skip'
  );
  
  const updateCustomer = useMutation(api.customers.updateCustomer);
  const deleteCustomer = useMutation(api.customers.deleteCustomer);

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

  const handleEdit = () => {
    setEditForm({
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      shippingAddress: { ...customer.shippingAddress },
      billingAddress: { ...customer.billingAddress },
      newsletter: customer.newsletter,
    });
    setIsEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!editForm) return;
    try {
      setError(null);
      await updateCustomer({
        customerId: customer._id,
        email: editForm.email,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        shippingAddress: editForm.shippingAddress,
        billingAddress: editForm.billingAddress,
        newsletter: editForm.newsletter,
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
    }
  };

  const handleDelete = async () => {
    try {
      setError(null);
      await deleteCustomer({ customerId: customer._id });
      navigate('/admin/customers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
      setShowDeleteModal(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                customer.isRegistered
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {customer.isRegistered ? 'Registered' : 'Guest'}
            </span>
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
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

      {/* Edit Modal */}
      {isEditing && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-900">Edit Customer</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="newsletter"
                  checked={editForm.newsletter}
                  onChange={(e) => setEditForm({ ...editForm, newsletter: e.target.checked })}
                  className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="newsletter" className="text-sm text-stone-700">Newsletter subscription</label>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-800 mb-2">Shipping Address</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Street"
                    value={editForm.shippingAddress.street}
                    onChange={(e) => setEditForm({ ...editForm, shippingAddress: { ...editForm.shippingAddress, street: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      value={editForm.shippingAddress.city}
                      onChange={(e) => setEditForm({ ...editForm, shippingAddress: { ...editForm.shippingAddress, city: e.target.value } })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="County"
                      value={editForm.shippingAddress.county}
                      onChange={(e) => setEditForm({ ...editForm, shippingAddress: { ...editForm.shippingAddress, county: e.target.value } })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={editForm.shippingAddress.postalCode}
                      onChange={(e) => setEditForm({ ...editForm, shippingAddress: { ...editForm.shippingAddress, postalCode: e.target.value } })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={editForm.shippingAddress.country}
                      onChange={(e) => setEditForm({ ...editForm, shippingAddress: { ...editForm.shippingAddress, country: e.target.value } })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-800 mb-2">Billing Address</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Street"
                    value={editForm.billingAddress.street}
                    onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, street: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      value={editForm.billingAddress.city}
                      onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, city: e.target.value } })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="County"
                      value={editForm.billingAddress.county}
                      onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, county: e.target.value } })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={editForm.billingAddress.postalCode}
                      onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, postalCode: e.target.value } })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={editForm.billingAddress.country}
                      onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, country: e.target.value } })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-stone-50 border-t border-stone-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-stone-700 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-stone-900 mb-1">Delete Customer</h3>
                <p className="text-sm text-stone-600 mb-4">
                  Are you sure you want to delete {customer.firstName} {customer.lastName}? This action cannot be undone.
                </p>
                {customer.orders && customer.orders.length > 0 && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      This customer has {customer.orders.length} order(s). Customers with orders cannot be deleted.
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-stone-700 hover:text-stone-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={customer.orders && customer.orders.length > 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CustomerDetail;

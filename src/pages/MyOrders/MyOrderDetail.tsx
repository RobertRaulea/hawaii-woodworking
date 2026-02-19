import type React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'În așteptare',
  paid: 'Plătită',
  shipped: 'Expediată',
  delivered: 'Livrată',
  cancelled: 'Anulată',
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

export const MyOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();

  const order = useQuery(
    api.orders.getMyOrderById,
    id ? { orderId: id as Id<'orders'> } : 'skip'
  );

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-stone-500">Se încarcă...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    navigate('/login', { replace: true });
    return null;
  }

  if (order === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-stone-500">Se încarcă comanda...</p>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-stone-500 mb-4">Comanda nu a fost găsită.</p>
        <Link
          to="/my-orders"
          className="text-amber-600 hover:text-amber-700 font-medium text-sm"
        >
          ← Înapoi la comenzi
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/my-orders"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi la comenzi
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">
              Comanda #{order._id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-sm text-stone-500 mt-1">{formatDate(order.createdAt)}</p>
          </div>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium self-start ${STATUS_COLORS[order.status as OrderStatus]}`}
          >
            {STATUS_LABELS[order.status as OrderStatus]}
          </span>
        </div>
      </div>

      {/* Addresses */}
      {order.customer && (
        <div className="bg-white rounded-lg border border-stone-200 p-5 mb-6">
          <h3 className="text-lg font-semibold text-stone-800 mb-4">Informații livrare</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-stone-500 mb-1">Nume</h4>
              <p className="text-sm text-stone-900">
                {order.customer.firstName} {order.customer.lastName}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-stone-500 mb-1">Email</h4>
              <p className="text-sm text-stone-900">{order.customer.email}</p>
            </div>
            <AddressDisplay label="Adresa de livrare" address={order.customer.shippingAddress} />
            <AddressDisplay label="Adresa de facturare" address={order.customer.billingAddress} />
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white rounded-lg border border-stone-200 p-5 mb-6">
        <h3 className="text-lg font-semibold text-stone-800 mb-4">Produse comandate</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="pb-2 text-left font-medium text-stone-600">Produs</th>
                <th className="pb-2 text-right font-medium text-stone-600">Preț</th>
                <th className="pb-2 text-right font-medium text-stone-600">Cant.</th>
                <th className="pb-2 text-right font-medium text-stone-600">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: { productId: string; name: string; price: number; quantity: number }, index: number) => (
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
    </div>
  );
};

export default MyOrderDetail;

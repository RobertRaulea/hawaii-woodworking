import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { ShoppingBag, Eye } from 'lucide-react';
import { api } from '../../../convex/_generated/api';

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

export const MyOrders: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const orders = useQuery(api.orders.getMyOrders);

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

  if (orders === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-stone-500">Se încarcă comenzile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Comenzile mele</h1>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-12 text-center">
          <ShoppingBag className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-600 text-lg mb-2">Nu ai comenzi încă</p>
          <p className="text-stone-400 mb-6">Explorează produsele noastre și plasează prima comandă.</p>
          <Link
            to="/products"
            className="inline-block bg-amber-600 text-white px-6 py-2.5 rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            Vezi produsele
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-lg border border-stone-200 p-5 hover:border-stone-300 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-stone-500">
                      #{order._id.slice(-8).toUpperCase()}
                    </span>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status as OrderStatus]}`}
                    >
                      {STATUS_LABELS[order.status as OrderStatus]}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 mb-1">
                    {formatDate(order.createdAt)}
                  </p>
                  <p className="text-sm text-stone-600">
                    {order.items.length} {order.items.length === 1 ? 'produs' : 'produse'} &middot;{' '}
                    <span className="font-semibold text-stone-900">
                      {formatPrice(order.total)}
                    </span>
                  </p>
                </div>

                <Link
                  to={`/my-orders/${order._id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Detalii
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;

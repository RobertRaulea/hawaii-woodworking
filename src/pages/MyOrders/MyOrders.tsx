import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
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



const formatPrice = (price: number): string => `${price.toFixed(2)} RON`;

export const MyOrders: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const orders = useQuery(api.orders.getMyOrders);

  const STATUS_LABELS: Record<OrderStatus, string> = {
    pending: t('orders.pending'),
    paid: t('orders.paid'),
    shipped: t('orders.shipped'),
    delivered: t('orders.delivered'),
    cancelled: t('orders.cancelled'),
  };

  const formatDate = (timestamp: number): string => {
    const locale = i18n.language === 'de' ? 'de-DE' : i18n.language === 'en' ? 'en-US' : 'ro-RO';
    return new Date(timestamp).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-stone-300 border-t-amber-600 rounded-full animate-spin"></div>
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
        <div className="w-6 h-6 border-2 border-stone-300 border-t-amber-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
      <h1 className="font-serif text-3xl lg:text-4xl font-medium text-stone-900 mb-8">{t('orders.title')}</h1>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="h-6 w-6 text-stone-400" />
          </div>
          <p className="font-serif text-xl font-medium text-stone-900 mb-2">{t('orders.noOrders')}</p>
          <p className="text-stone-500 text-sm mb-8">{t('orders.noOrdersDescription')}</p>
          <Link
            to="/products"
            className="inline-block border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white px-8 py-2.5 rounded-md text-sm font-medium transition-all duration-200"
          >
            {t('orders.viewProducts')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-lg border border-stone-200 p-5 hover:border-stone-300 transition-all duration-200"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-xs text-stone-400 tracking-wide">
                      #{order._id.slice(-8).toUpperCase()}
                    </span>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status as OrderStatus]}`}
                    >
                      {STATUS_LABELS[order.status as OrderStatus]}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mb-1">
                    {formatDate(order.createdAt)}
                  </p>
                  <p className="text-sm text-stone-600">
                    {order.items.length} {order.items.length === 1 ? t('orders.item') : t('orders.items')} &middot;{' '}
                    <span className="font-semibold text-stone-900">
                      {formatPrice(order.total)}
                    </span>
                  </p>
                </div>

                <Link
                  to={`/my-orders/${order._id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 hover:border-stone-400 hover:text-stone-900 transition-all duration-200"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {t('orders.viewDetails')}
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

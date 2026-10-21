import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import { useAdminQuery } from '../../../hooks/useAdminQuery';

export const InventoryReviewSummary = () => {
  const { data, error } = useAdminQuery(api.orders.getInventoryIssues, {});
  if (error)
    return (
      <p
        role="alert"
        className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
      >
        Verificarea comenzilor cu probleme de stoc nu este disponibilă. Verifică
        sincronizarea backendului.
      </p>
    );
  if (!data?.length) return null;
  return (
    <section
      aria-label="Plăți online cu stoc de verificat"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
        <div>
          <h2 className="font-semibold">
            {data.length} comenzi plătite au stoc de verificat
          </h2>
          <p className="mt-1 text-sm">
            Plata este confirmată. Verifică inventarul înainte de expediere; nu
            solicita o nouă plată.
          </p>
        </div>
      </div>
      <ul className="ml-9 mt-3 space-y-2 text-sm">
        {data.slice(0, 5).map((issue) => (
          <li key={issue.orderId}>
            <Link
              to={`/admin/orders/${issue.orderId}`}
              className="font-medium underline underline-offset-4"
            >
              Comanda #{issue.orderId.slice(-8).toUpperCase()}
            </Link>
            <span className="ml-2">{issue.error}</span>
          </li>
        ))}
      </ul>
      {data.length > 5 ? (
        <Link
          to="/admin/orders"
          className="ml-9 mt-3 inline-block text-sm underline"
        >
          Vezi toate comenzile
        </Link>
      ) : null}
    </section>
  );
};

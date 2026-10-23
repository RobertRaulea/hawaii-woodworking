import { usePaginatedQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useStaffDirectory } from '../../../hooks/useStaffDirectory';
import type { StockLocation } from '../../../utils/inventory.utils';
import { locationFairId } from '../../../utils/inventory.utils';

interface StockMovementsHistoryProps {
  location: StockLocation;
  productId: Id<'products'> | null;
}

const KIND_LABELS: Record<string, string> = {
  receipt: 'Intrare',
  adjustment: 'Ajustare',
  count: 'Inventariere',
  transfer: 'Transfer',
  transfer_out: 'Expediere transfer',
  transfer_in: 'Recepție transfer',
  sale: 'Vânzare POS',
  online_sale: 'Vânzare online',
};

const REASON_LABELS: Record<string, string> = {
  production: 'Producție',
  damaged: 'Deteriorat',
  lost: 'Pierdut',
  found: 'Găsit',
  correction: 'Corecție',
  other: 'Altele',
  count: 'Inventariere',
  fair_archive: 'Arhivare târg',
};

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString('ro-RO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

export const StockMovementsHistory = ({
  location,
  productId,
}: StockMovementsHistoryProps) => {
  const userLabel = useStaffDirectory();
  const fairId = locationFairId(location);
  const locationArg =
    location === 'all' ? undefined : fairId ? 'fair' : 'workshop';
  const { results, status, loadMore } = usePaginatedQuery(
    api.inventory.movements,
    {
      location: locationArg,
      fairId: (fairId as Id<'fairs'> | null) ?? undefined,
      productId: productId ?? undefined,
    },
    { initialNumItems: 25 },
  );

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-stone-900">
        Istoric mișcări de stoc
      </h2>
      {status === 'LoadingFirstPage' ? (
        <p className="mt-3 text-sm text-stone-500">Se încarcă istoricul...</p>
      ) : results.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          Nu există mișcări pentru filtrul curent.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-stone-600">
                  Data
                </th>
                <th className="px-3 py-2 text-left font-medium text-stone-600">
                  Produs
                </th>
                <th className="px-3 py-2 text-left font-medium text-stone-600">
                  Locație
                </th>
                <th className="px-3 py-2 text-left font-medium text-stone-600">
                  Tip
                </th>
                <th className="px-3 py-2 text-right font-medium text-stone-600">
                  Cantitate
                </th>
                <th className="px-3 py-2 text-right font-medium text-stone-600">
                  Sold după
                </th>
                <th className="px-3 py-2 text-left font-medium text-stone-600">
                  Motiv/Notă
                </th>
                <th className="px-3 py-2 text-left font-medium text-stone-600">
                  Operator
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {results.map((row) => (
                <tr key={row._id}>
                  <td className="whitespace-nowrap px-3 py-2 text-stone-500">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-3 py-2 font-medium text-stone-900">
                    {row.productName}
                  </td>
                  <td className="px-3 py-2 text-stone-600">
                    {row.location === 'workshop'
                      ? 'Atelier'
                      : (row.fairName ?? 'Târg')}
                  </td>
                  <td className="px-3 py-2 text-stone-600">
                    {KIND_LABELS[row.kind] ?? row.kind}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.balanceAfter}
                  </td>
                  <td className="max-w-48 truncate px-3 py-2 text-stone-600">
                    {[row.reason ? (REASON_LABELS[row.reason] ?? row.reason) : null, row.note]
                      .filter(Boolean)
                      .join(' · ')}
                  </td>
                  <td className="px-3 py-2 text-xs text-stone-500">
                    {userLabel(row.actorId)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {status === 'CanLoadMore' ? (
        <button
          type="button"
          onClick={() => loadMore(25)}
          className="mt-3 min-h-11 rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Încarcă mai multe
        </button>
      ) : null}
    </section>
  );
};

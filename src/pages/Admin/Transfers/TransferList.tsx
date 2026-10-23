import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ArrowsRightLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import {
  TRANSFER_STATUS_LABELS,
  TRANSFER_STATUS_ORDER,
  WORKSHOP,
} from '../../../utils/transfer.utils';
const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString('ro-RO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

const selectClass =
  'rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40';

const badgeClass = (status: string) =>
  `inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
    status === 'received'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'cancelled'
        ? 'bg-stone-200 text-stone-600'
        : status === 'in_transit' || status === 'partially_received'
          ? 'bg-sky-100 text-sky-800'
          : 'bg-amber-100 text-amber-800'
  }`;

const TransferList = () => {
  const { can } = useStaffAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'all';
  const location = searchParams.get('location') ?? 'all';
  const overview = useQuery(api.pos.getStockOverview);
  const queryArgs = {
    ...(status !== 'all' ? { status: status as never } : {}),
    ...(location === WORKSHOP
      ? { location: 'workshop' as const }
      : location !== 'all'
        ? { fairId: location as Id<'fairs'> }
        : {}),
  };
  const transfers = useQuery(api.transfers.list, queryArgs);
  const fairs = overview?.fairs ?? [];

  const updateParam = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete(name);
    else next.set(name, value);
    setSearchParams(next, { replace: true });
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-900">Transferuri</h1>
        <div className="flex flex-wrap gap-2">
          {can('transfers.request') && (
            <Link
              to="/admin/transfers/new?mode=request"
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-600 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              Solicită reaprovizionare
            </Link>
          )}
          {can('transfers.execute') && (
            <Link
              to="/admin/transfers/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              <PlusIcon className="h-4 w-4" /> Transfer nou
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-stone-500">
          Stare
          <select
            className={selectClass}
            value={status}
            onChange={(event) => updateParam('status', event.target.value)}
          >
            <option value="all">Toate</option>
            {TRANSFER_STATUS_ORDER.map((item) => (
              <option key={item} value={item}>
                {TRANSFER_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-stone-500">
          Locație
          <select
            className={selectClass}
            value={location}
            onChange={(event) => updateParam('location', event.target.value)}
          >
            <option value="all">Toate locațiile</option>
            <option value={WORKSHOP}>Atelier</option>
            {fairs.map((fair) => (
              <option key={fair._id} value={fair._id}>
                {fair.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {transfers === undefined ? (
        <p className="text-sm text-stone-500">Se încarcă…</p>
      ) : transfers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center">
          <ArrowsRightLeftIcon className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-2 text-sm text-stone-500">
            Nu există transferuri pentru filtrele selectate.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Creat</th>
                <th className="px-4 py-3">De la</th>
                <th className="px-4 py-3">Către</th>
                <th className="px-4 py-3">Produse</th>
                <th className="px-4 py-3">Buc.</th>
                <th className="px-4 py-3">În tranzit</th>
                <th className="px-4 py-3">Stare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {transfers.map((transfer) => (
                <tr key={transfer._id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                    <Link
                      to={`/admin/transfers/${transfer._id}`}
                      className="font-medium text-stone-900 hover:text-amber-700"
                    >
                      {formatDate(transfer.createdAt)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{transfer.fromName ?? '—'}</td>
                  <td className="px-4 py-3">{transfer.toName ?? '—'}</td>
                  <td className="px-4 py-3">{transfer.lineCount}</td>
                  <td className="px-4 py-3">{transfer.totalUnits}</td>
                  <td className="px-4 py-3">{transfer.inTransitUnits}</td>
                  <td className="px-4 py-3">
                    <span className={badgeClass(transfer.status)}>
                      {TRANSFER_STATUS_LABELS[transfer.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default TransferList;

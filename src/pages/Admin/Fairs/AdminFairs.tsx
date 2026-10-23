import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import {
  ArchiveBoxIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { useInventoryOperation } from '../../../hooks/useInventoryOperation';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { InventoryFeedback } from '../Inventory/InventoryFeedback';
import { FairForm } from './FairForm';
import { FairSellers } from './FairSellers';
import { ArchiveFairDialog } from './ArchiveFairDialog';

interface FairWorkspaceProps {
  actorId: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const fairStatus = (fair: {
  active: boolean;
  startsOn?: string;
  endsOn?: string;
}) => {
  if (!fair.active) return 'Arhivat';
  const day = today();
  if (fair.startsOn && day < fair.startsOn) return 'Planificat';
  if (fair.endsOn && day > fair.endsOn) return 'Încheiat';
  return 'Activ';
};

const fairPeriod = (fair: { startsOn?: string; endsOn?: string }) => {
  if (fair.startsOn && fair.endsOn)
    return `${fair.startsOn} – ${fair.endsOn}`;
  if (fair.startsOn) return `din ${fair.startsOn}`;
  if (fair.endsOn) return `până la ${fair.endsOn}`;
  return 'fără perioadă';
};

const FairWorkspace = ({ actorId }: FairWorkspaceProps) => {
  const { data: fairs, error } = useAdminQuery(api.pos.listFairs, {
    includeArchived: true,
  });
  const operation = useInventoryOperation(actorId);
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [archiving, setArchiving] = useState<Id<'fairs'> | null>(null);
  const [editing, setEditing] = useState<Doc<'fairs'> | null>(null);
  const active = fairs?.filter((fair) => fair.active).length ?? 0;
  const visible = fairs?.filter(
    (fair) => fair.active === (filter === 'active'),
  );
  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            Puncte de vânzare
          </p>
          <h1 className="text-3xl font-semibold text-stone-900">Târguri</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">
            Pregătește punctele de vânzare aici. La târg, ecranul POS rămâne
            doar pentru vânzare.
          </p>
        </div>
        <button
          type="button"
          disabled={operation.blocked || !operation.online || !fairs}
          onClick={() => {
            setCreated(false);
            setCreating(true);
          }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-40"
        >
          <PlusIcon className="h-5 w-5" /> Adaugă târg
        </button>
      </header>
      {!operation.online ? (
        <p
          role="status"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          Fără conexiune la server. Crearea și arhivarea sunt blocate până la
          reconectare.
        </p>
      ) : null}
      <InventoryFeedback
        operation={
          archiving ? { ...operation, pending: null, error: '' } : operation
        }
      />
      {created ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          Târgul a fost creat. Poți aloca produse din pagina Stocuri.
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      ) : !fairs ? (
        <p role="status" className="py-12 text-center text-stone-500">
          Se încarcă târgurile...
        </p>
      ) : (
        <>
          <nav
            aria-label="Starea târgurilor"
            className="flex gap-2 border-b border-stone-200 pb-4"
          >
            <button
              type="button"
              aria-pressed={filter === 'active'}
              onClick={() => setFilter('active')}
              className={`min-h-11 rounded-lg px-4 text-sm font-medium ${filter === 'active' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600'}`}
            >
              Active ({active})
            </button>
            <button
              type="button"
              aria-pressed={filter === 'archived'}
              onClick={() => setFilter('archived')}
              className={`min-h-11 rounded-lg px-4 text-sm font-medium ${filter === 'archived' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600'}`}
            >
              Arhivate ({fairs.length - active})
            </button>
          </nav>
          {!visible?.length ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
              <MapPinIcon className="mx-auto mb-3 h-9 w-9 text-stone-300" />
              <p className="font-medium text-stone-700">
                Nu există târguri {filter === 'active' ? 'active' : 'arhivate'}.
              </p>
              <p className="mt-2 text-sm text-stone-500">
                {filter === 'active'
                  ? 'Adaugă primul târg pentru a începe pregătirea stocului.'
                  : 'Arhivarea păstrează istoricul și returnează stocul online.'}
              </p>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              {visible.map((fair) => {
                const status = fairStatus(fair);
                return (
                  <li
                    key={fair._id}
                    className="flex flex-col gap-4 border-b border-stone-100 p-5 last:border-0 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-xl p-3 ${fair.active ? 'bg-amber-50 text-amber-800' : 'bg-stone-100 text-stone-500'}`}
                      >
                        <MapPinIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-stone-900">
                          {fair.name}
                        </h2>
                        <p className="mt-1 text-xs text-stone-500">
                          {status} · {fairPeriod(fair)}
                          {!fair.active && fair.archivedAt
                            ? ` · arhivat la ${new Date(fair.archivedAt).toLocaleDateString('ro-RO')} · istoric păstrat`
                            : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-400">
                          Locație de inventar: stocul propriu al târgului
                        </p>
                        {fair.active ? <FairSellers fairId={fair._id} /> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/admin/pos?fairId=${fair._id}`}
                        className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700"
                      >
                        Deschide POS
                      </Link>
                      <Link
                        to={`/admin/inventory?fairId=${fair._id}`}
                        className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700"
                      >
                        Stoc
                      </Link>
                      <Link
                        to={`/admin/transfers?location=${fair._id}`}
                        className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700"
                      >
                        Transferuri
                      </Link>
                      <Link
                        to={`/admin/transfers/new?from=workshop&to=${fair._id}`}
                        className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700"
                      >
                        Transfer nou
                      </Link>
                      {fair.active ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing(fair)}
                            aria-label={`Editează ${fair.name}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm text-stone-700 hover:bg-stone-50"
                          >
                            <PencilSquareIcon className="h-4 w-4" /> Editează
                          </button>
                          <button
                            type="button"
                            disabled={operation.blocked || !operation.online}
                            onClick={() => setArchiving(fair._id)}
                            aria-label={`Arhivează ${fair.name}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm text-amber-900 hover:bg-amber-50 disabled:opacity-40"
                          >
                            <ArchiveBoxIcon className="h-4 w-4" /> Arhivează
                          </button>
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      {creating ? (
        <AdminDialog title="Târg nou" onClose={() => setCreating(false)}>
          <FairForm
            disabled={!operation.online}
            onCreated={() => {
              setCreating(false);
              setCreated(true);
              setFilter('active');
            }}
          />
        </AdminDialog>
      ) : null}
      {editing ? (
        <AdminDialog title="Editează târg" onClose={() => setEditing(null)}>
          <FairForm
            fair={editing}
            disabled={!operation.online}
            onCreated={() => setEditing(null)}
          />
        </AdminDialog>
      ) : null}
      {archiving ? (
        <ArchiveFairDialog
          fairId={archiving}
          operation={operation}
          onClose={() => setArchiving(null)}
        />
      ) : null}
    </section>
  );
};

export const AdminFairs = () => {
  const { user } = useUser();
  return user ? <FairWorkspace key={user.id} actorId={user.id} /> : null;
};

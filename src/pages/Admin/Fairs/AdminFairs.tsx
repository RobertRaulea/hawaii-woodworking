import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Archive, MapPin, SquarePen, Plus } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { useInventoryOperation } from '../../../hooks/useInventoryOperation';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
 <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300 ">
 Puncte de vânzare
 </p>
 <h1 className="text-3xl font-semibold text-stone-900 dark:text-stone-50 ">Târguri</h1>
 <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500 dark:text-stone-400 ">
 Pregătește punctele de vânzare aici. La târg, ecranul POS rămâne
 doar pentru vânzare.
 </p>
 </div>
 <Button
 type="button"
 disabled={operation.blocked || !operation.online || !fairs}
 onClick={() => {
 setCreated(false);
 setCreating(true);
 }}
 className="h-auto min-h-12 gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
 >
 <Plus className="h-5 w-5" /> Adaugă târg
 </Button>
 </header>
 {!operation.online ? (
 <Alert variant="warning" role="status">
 <AlertDescription>
 Fără conexiune la server. Crearea și arhivarea sunt blocate până
 la reconectare.
 </AlertDescription>
 </Alert>
 ) : null}
 <InventoryFeedback
 operation={
 archiving ? { ...operation, pending: null, error: '' } : operation
 }
 />
 {created ? (
 <Alert variant="success" role="status">
 <AlertDescription>
 Târgul a fost creat. Poți aloca produse din pagina Stocuri.
 </AlertDescription>
 </Alert>
 ) : null}
 {error ? (
 <Alert variant="destructive">
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 ) : !fairs ? (
 <p role="status" className="py-12 text-center text-stone-500 dark:text-stone-400 ">
 Se încarcă târgurile...
 </p>
 ) : (
 <>
 <nav
 aria-label="Starea târgurilor"
 className="flex gap-2 border-b border-stone-200 dark:border-stone-800 pb-4"
 >
 <Button
 type="button"
 variant={filter === 'active' ? 'secondary' : 'outline'}
 aria-pressed={filter === 'active'}
 onClick={() => setFilter('active')}
 className="min-h-11 rounded-lg px-4 text-sm font-medium"
 >
 Active ({active})
 </Button>
 <Button
 type="button"
 variant={filter === 'archived' ? 'secondary' : 'outline'}
 aria-pressed={filter === 'archived'}
 onClick={() => setFilter('archived')}
 className="min-h-11 rounded-lg px-4 text-sm font-medium"
 >
 Arhivate ({fairs.length - active})
 </Button>
 </nav>
 {!visible?.length ? (
 <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-10 text-center">
 <MapPin className="mx-auto mb-3 h-9 w-9 text-stone-300" />
 <p className="font-medium text-stone-700 dark:text-stone-300 ">
 Nu există târguri {filter === 'active' ? 'active' : 'arhivate'}.
 </p>
 <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 ">
 {filter === 'active'
 ? 'Adaugă primul târg pentru a începe pregătirea stocului.'
 : 'Arhivarea păstrează istoricul și returnează stocul online.'}
 </p>
 </div>
 ) : (
 <ul className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 ">
 {visible.map((fair) => {
 const status = fairStatus(fair);
 return (
 <li
 key={fair._id}
 className="flex flex-col gap-4 border-b border-stone-100 dark:border-stone-800 p-5 last:border-0 md:flex-row md:items-center md:justify-between"
 >
 <div className="flex items-start gap-3">
 <div
 className={`rounded-xl p-3 ${fair.active ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 ' : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 '}`}
 >
 <MapPin className="h-5 w-5" />
 </div>
 <div>
 <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50 ">
 {fair.name}
 </h2>
 <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 ">
 {status} · {fairPeriod(fair)}
 {!fair.active && fair.archivedAt
 ? ` · arhivat la ${new Date(fair.archivedAt).toLocaleDateString('ro-RO')} · istoric păstrat`
 : ''}
 </p>
 <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500 ">
 Locație de inventar: stocul propriu al târgului
 </p>
 {fair.active ? <FairSellers fairId={fair._id} /> : null}
 </div>
 </div>
 <div className="flex flex-wrap gap-2">
 <Button
 asChild
 variant="outline"
 className="min-h-11 rounded-lg px-4 text-sm font-medium"
 >
 <Link to={`/admin/pos?fairId=${fair._id}`}>
 Deschide POS
 </Link>
 </Button>
 <Button
 asChild
 variant="outline"
 className="min-h-11 rounded-lg px-4 text-sm font-medium"
 >
 <Link to={`/admin/inventory?fairId=${fair._id}`}>
 Stoc
 </Link>
 </Button>
 <Button
 asChild
 variant="outline"
 className="min-h-11 rounded-lg px-4 text-sm font-medium"
 >
 <Link to={`/admin/transfers?location=${fair._id}`}>
 Transferuri
 </Link>
 </Button>
 <Button
 asChild
 variant="outline"
 className="min-h-11 rounded-lg px-4 text-sm font-medium"
 >
 <Link
 to={`/admin/transfers/new?from=workshop&to=${fair._id}`}
 >
 Transfer nou
 </Link>
 </Button>
 {fair.active ? (
 <>
 <Button
 type="button"
 variant="ghost"
 onClick={() => setEditing(fair)}
 aria-label={`Editează ${fair.name}`}
 className="min-h-11 gap-2 rounded-lg px-4 text-sm"
 >
 <SquarePen className="h-4 w-4" /> Editează
 </Button>
 <Button
 type="button"
 variant="ghost"
 disabled={operation.blocked || !operation.online}
 onClick={() => setArchiving(fair._id)}
 aria-label={`Arhivează ${fair.name}`}
 className="min-h-11 gap-2 rounded-lg px-4 text-sm text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60"
 >
 <Archive className="h-4 w-4" /> Arhivează
 </Button>
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

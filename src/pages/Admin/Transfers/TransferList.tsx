import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
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
 'rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-50 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40';

const badgeClass = (status: string) =>
 `inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
 status === 'received'
 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 '
 : status === 'cancelled'
 ? 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 '
 : status === 'in_transit' || status === 'partially_received'
 ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 '
 : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 '
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
 <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50 ">Transferuri</h1>
 <div className="flex flex-wrap gap-2">
 {can('transfers.request') && (
 <Button
 asChild
 variant="outline"
 className="gap-1.5 rounded-md border-amber-600 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-700 dark:hover:text-amber-400"
 >
 <Link to="/admin/transfers/new?mode=request">
 Solicită reaprovizionare
 </Link>
 </Button>
 )}
 {can('transfers.execute') && (
 <Button
 asChild
 className="gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-700"
 >
 <Link to="/admin/transfers/new">
 <Plus className="h-4 w-4" /> Transfer nou
 </Link>
 </Button>
 )}
 </div>
 </div>

 <div className="flex flex-wrap gap-3">
 <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400 ">
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
 <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400 ">
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
 <p className="text-sm text-stone-500 dark:text-stone-400 ">Se încarcă…</p>
 ) : transfers.length === 0 ? (
 <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-700 p-8 text-center">
 <ArrowLeftRight className="mx-auto h-8 w-8 text-stone-300" />
 <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 ">
 Nu există transferuri pentru filtrele selectate.
 </p>
 </div>
 ) : (
 <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800 ">
 <Table className="min-w-full text-sm">
 <TableHeader className="bg-stone-50 dark:bg-stone-800 text-left text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400 ">
 <TableRow className="hover:bg-stone-50 dark:hover:bg-stone-900">
 <TableHead className="px-4 py-3">Creat</TableHead>
 <TableHead className="px-4 py-3">De la</TableHead>
 <TableHead className="px-4 py-3">Către</TableHead>
 <TableHead className="px-4 py-3">Produse</TableHead>
 <TableHead className="px-4 py-3">Buc.</TableHead>
 <TableHead className="px-4 py-3">În tranzit</TableHead>
 <TableHead className="px-4 py-3">Stare</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {transfers.map((transfer) => (
 <TableRow key={transfer._id} className="hover:bg-stone-50 dark:hover:bg-stone-900">
 <TableCell className="whitespace-nowrap px-4 py-3 text-stone-600 dark:text-stone-300 ">
 <Link
 to={`/admin/transfers/${transfer._id}`}
 className="font-medium text-stone-900 dark:text-stone-50 hover:text-amber-700 dark:hover:text-amber-400"
 >
 {formatDate(transfer.createdAt)}
 </Link>
 </TableCell>
 <TableCell className="px-4 py-3">{transfer.fromName ?? '—'}</TableCell>
 <TableCell className="px-4 py-3">{transfer.toName ?? '—'}</TableCell>
 <TableCell className="px-4 py-3">{transfer.lineCount}</TableCell>
 <TableCell className="px-4 py-3">{transfer.totalUnits}</TableCell>
 <TableCell className="px-4 py-3">{transfer.inTransitUnits}</TableCell>
 <TableCell className="px-4 py-3">
 <Badge
 variant="soft"
 className={badgeClass(transfer.status)}
 >
 {TRANSFER_STATUS_LABELS[transfer.status]}
 </Badge>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </section>
 );
};

export default TransferList;

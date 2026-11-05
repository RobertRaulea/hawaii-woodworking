import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { OptionSelect } from '../../../components/OptionSelect';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn.utils';
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
import type { TransferStatus } from '../../../types/transfers.types';
const formatDate = (timestamp: number) =>
 new Date(timestamp).toLocaleString('ro-RO', {
 dateStyle: 'short',
 timeStyle: 'short',
 });

const TRANSFER_STATUS_BADGE: Record<
 TransferStatus,
 { variant: 'emerald' | 'stone' | 'amber' | 'soft'; className?: string }
> = {
 requested: { variant: 'amber' },
 draft: { variant: 'amber' },
 in_transit: {
 variant: 'soft',
 className: 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 ',
 },
 partially_received: {
 variant: 'soft',
 className: 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 ',
 },
 received: { variant: 'emerald' },
 cancelled: { variant: 'stone' },
};

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
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-foreground">Transferuri</h1>
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
 <Button variant="brand"
 asChild
 className="gap-1.5 rounded-md"
 >
 <Link to="/admin/transfers/new">
 <Plus className="size-4" /> Transfer nou
 </Link>
 </Button>
 )}
 </div>
 </div>

 <div className="flex flex-wrap gap-3">
 <Label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
 Stare
 <OptionSelect
 value={status}
 onValueChange={(v) => updateParam('status', v)}
 options={[
 { value: 'all', label: 'Toate' },
 ...TRANSFER_STATUS_ORDER.map((item) => ({
 value: item,
 label: TRANSFER_STATUS_LABELS[item],
 })),
 ]}
 />
 </Label>
 <Label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
 Locație
 <OptionSelect
 value={location}
 onValueChange={(v) => updateParam('location', v)}
 options={[
 { value: 'all', label: 'Toate locațiile' },
 { value: WORKSHOP, label: 'Atelier' },
 ...fairs.map((fair) => ({ value: fair._id, label: fair.name })),
 ]}
 />
 </Label>
 </div>

 {transfers === undefined ? (
 <p className="text-sm text-muted-foreground">Se încarcă…</p>
 ) : transfers.length === 0 ? (
 <Empty className="gap-0 flex-initial rounded-lg border border-dashed border-stone-300 dark:border-stone-700 p-8 text-center">
 <ArrowLeftRight className="mx-auto size-8 text-stone-300" />
 <p className="mt-2 text-sm text-muted-foreground">
 Nu există transferuri pentru filtrele selectate.
 </p>
 </Empty>
 ) : (
 <div className="overflow-x-auto rounded-lg border border-border">
 <Table className="min-w-full text-sm">
 <TableHeader className="bg-stone-50 dark:bg-stone-800 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
 className="font-medium text-foreground hover:text-amber-700 dark:hover:text-amber-400"
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
 variant={TRANSFER_STATUS_BADGE[transfer.status].variant}
 className={cn(
 'font-medium',
 TRANSFER_STATUS_BADGE[transfer.status].className
 )}
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

import { usePaginatedQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useStaffDirectory } from '../../../hooks/useStaffDirectory';
import { useProductThumbnails } from '../../../hooks/useProductThumbnails';
import type { StockLocation } from '../../../utils/inventory.utils';
import { locationFairId } from '../../../utils/inventory.utils';
import { ProductThumb } from '../../../components/ProductThumb';
import { Button } from '@/components/ui/button';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';

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
 const thumbnails = useProductThumbnails();
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
 <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50 ">
 Istoric mișcări de stoc
 </h2>
 {status === 'LoadingFirstPage' ? (
 <p className="mt-3 text-sm text-stone-500 dark:text-stone-400 ">Se încarcă istoricul...</p>
 ) : results.length === 0 ? (
 <p className="mt-3 text-sm text-stone-500 dark:text-stone-400 ">
 Nu există mișcări pentru filtrul curent.
 </p>
 ) : (
 <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 ">
 <Table className="min-w-full text-sm">
 <TableHeader className="bg-stone-50 dark:bg-stone-800 ">
 <TableRow className="hover:bg-stone-50 dark:hover:bg-stone-900">
 <TableHead className="px-3 py-2 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Data
 </TableHead>
 <TableHead className="px-3 py-2 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Produs
 </TableHead>
 <TableHead className="px-3 py-2 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Locație
 </TableHead>
 <TableHead className="px-3 py-2 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Tip
 </TableHead>
 <TableHead className="px-3 py-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Cantitate
 </TableHead>
 <TableHead className="px-3 py-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Sold după
 </TableHead>
 <TableHead className="px-3 py-2 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Motiv/Notă
 </TableHead>
 <TableHead className="px-3 py-2 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Operator
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {results.map((row) => (
 <TableRow key={row._id} className="hover:bg-transparent">
 <TableCell className="whitespace-nowrap px-3 py-2 text-stone-500 dark:text-stone-400 ">
 {formatDate(row.createdAt)}
 </TableCell>
 <TableCell className="px-3 py-2 font-medium text-stone-900 dark:text-stone-50 ">
 <span className="flex items-center gap-2.5">
 <ProductThumb
 src={thumbnails.get(row.productId)}
 alt={row.productName}
 className="h-8 w-8"
 />
 {row.productName}
 </span>
 </TableCell>
 <TableCell className="px-3 py-2 text-stone-600 dark:text-stone-300 ">
 {row.location === 'workshop'
 ? 'Atelier'
 : (row.fairName ?? 'Târg')}
 </TableCell>
 <TableCell className="px-3 py-2 text-stone-600 dark:text-stone-300 ">
 {KIND_LABELS[row.kind] ?? row.kind}
 </TableCell>
 <TableCell className="px-3 py-2 text-right tabular-nums">
 {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
 </TableCell>
 <TableCell className="px-3 py-2 text-right tabular-nums">
 {row.balanceAfter}
 </TableCell>
 <TableCell className="max-w-48 truncate px-3 py-2 text-stone-600 dark:text-stone-300 ">
 {[row.reason ? (REASON_LABELS[row.reason] ?? row.reason) : null, row.note]
 .filter(Boolean)
 .join(' · ')}
 </TableCell>
 <TableCell className="px-3 py-2 text-xs text-stone-500 dark:text-stone-400 ">
 {userLabel(row.actorId)}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 {status === 'CanLoadMore' ? (
 <Button
 type="button"
 variant="outline"
 onClick={() => loadMore(25)}
 className="mt-3 min-h-11 rounded-lg px-4 text-sm font-medium"
 >
 Încarcă mai multe
 </Button>
 ) : null}
 </section>
 );
};

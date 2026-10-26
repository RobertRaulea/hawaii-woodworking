import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
 Table,
 TableBody,
 TableCaption,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { useProductThumbnails } from '../../../hooks/useProductThumbnails';
import { ProductThumb } from '../../../components/ProductThumb';
import { formatStock } from '../../../utils/inventory.utils';
import { InventoryFeedback } from '../Inventory/InventoryFeedback';
import type { InventoryController } from '../../../types/inventory.types';

interface ArchiveFairDialogProps {
 fairId: Id<'fairs'>;
 operation: InventoryController;
 onClose: () => void;
}

export const ArchiveFairDialog = ({
 fairId,
 operation,
 onClose,
}: ArchiveFairDialogProps) => {
 const { data, error } = useAdminQuery(api.pos.getArchivePreview, { fairId });
 const thumbnails = useProductThumbnails();
 const previous = useRef(operation.completed?.requestId);
 const [requestId] = useState(() => crypto.randomUUID());
 const submitted = useRef(false);
 useEffect(() => {
 if (
 submitted.current &&
 operation.completed &&
 operation.completed.requestId !== previous.current
 )
 onClose();
 }, [operation.completed, onClose]);
 const blocked =
 !data ||
 !data.fair.active ||
 data.pendingPayments > 0 ||
 data.tooLarge ||
 data.items.some((item) => item.issue !== null) ||
 operation.blocked ||
 operation.busy ||
 !operation.online;
 return (
 <AdminDialog
 title="Arhivare târg"
 locked={Boolean(operation.pending) || operation.busy}
 onClose={onClose}
 >
 {error ? (
 <Alert variant="destructive">
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 ) : !data ? (
 <p role="status">Se verifică stocul și plățile...</p>
 ) : (
 <>
 <AlertTriangle className="mb-3 h-8 w-8 text-amber-700 dark:text-amber-400 " />
 <h3 className="text-xl font-semibold">{data.fair.name}</h3>
 <p className="mb-5 mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300 ">
 Produsele de mai jos vor fi returnate în stocul online. Târgul nu va
 mai apărea în POS; vânzările și istoricul rămân păstrate.
 </p>
 {data.pendingPayments > 0 ? (
 <Alert variant="destructive" className="mb-4">
 <AlertDescription>
 Există {data.pendingPayments} plăți POS neclarificate. Rezolvă
 plățile înainte de arhivare.
 </AlertDescription>
 </Alert>
 ) : null}
 {data.tooLarge ? (
 <Alert variant="destructive" className="mb-4">
 <AlertDescription>
 Prea multe produse pentru o singură arhivare. Transferă stocul
 explicit înainte.
 </AlertDescription>
 </Alert>
 ) : null}
 {!data.fair.active ? (
 <Alert variant="warning" role="status" className="mb-4">
 <AlertDescription>
 Acest târg este deja arhivat.
 </AlertDescription>
 </Alert>
 ) : null}
 {data.items.length ? (
 <div className="mb-5 overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800 ">
 <Table className="w-full text-sm">
 <TableCaption className="sr-only">
 Produsele returnate online la arhivare
 </TableCaption>
 <TableHeader className="bg-stone-50 dark:bg-stone-800 text-xs text-stone-500 dark:text-stone-400 ">
 <TableRow>
 <TableHead className="p-3 text-left">Produs</TableHead>
 <TableHead className="p-3 text-right">De returnat</TableHead>
 <TableHead className="p-3 text-right">Disponibil online după</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {data.items.map((item) => (
 <TableRow
 key={item.productId}
 className="border-t border-stone-100 dark:border-stone-800 "
 >
 <TableCell className="p-3 font-medium">
 <span className="flex items-center gap-3">
 <ProductThumb
 src={thumbnails.get(item.productId)}
 alt={item.name}
 />
 {item.name}
 </span>
 {item.issue ? (
 <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400 ">
 {item.issue}
 </p>
 ) : null}
 </TableCell>
 <TableCell className="p-3 text-right tabular-nums">
 {formatStock(item.quantity)}
 </TableCell>
 <TableCell className="p-3 text-right tabular-nums">
 {formatStock(item.onlineAfter)}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 ) : (
 <p className="mb-5 rounded-lg bg-stone-100 dark:bg-stone-800 p-4 text-sm">
 Târgul nu mai are produse în stoc.
 </p>
 )}
 <p className="mb-4 text-sm font-medium">
 Total de returnat:{' '}
 {formatStock(
 data.items.reduce((sum, item) => sum + item.quantity, 0),
 )}{' '}
 buc. · Totalul general nu se schimbă.
 </p>
 <Button
 type="button"
 disabled={blocked}
 onClick={async () => {
 submitted.current = true;
 await operation.start({
 requestId,
 kind: 'archive',
 fairId,
 expectedInventory: data.items.map(
 ({ productId, quantity }) => ({ productId, quantity }),
 ),
 });
 }}
 className="h-auto min-h-12 w-full rounded-xl bg-amber-800 px-4 py-3 font-semibold hover:bg-amber-900"
 >
 Returnează stocul online și arhivează
 </Button>
 </>
 )}
 <InventoryFeedback operation={{ ...operation, completed: null }} />
 </AdminDialog>
 );
};

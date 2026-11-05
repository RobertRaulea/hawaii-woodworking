import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Link } from 'react-router-dom';
import { formatStock } from '../../../utils/inventory.utils';
import {
 filterStockRows,
 locationFairId,
 locationStock,
} from '../../../utils/inventory.utils';
import type { StockAvailability, StockLocation } from '../../../utils/inventory.utils';
import type {
 InventoryFair,
 InventoryProduct,
} from '../../../types/inventory.types';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { useProductThumbnails } from '../../../hooks/useProductThumbnails';
import { useInventoryOperation } from '../../../hooks/useInventoryOperation';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { useStockOperation } from '../../../hooks/useStockOperation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OptionSelect } from '../../../components/OptionSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { ProductThumb } from '../../../components/ProductThumb';
import { InventoryFeedback } from './InventoryFeedback';
import { StockOperationFeedback } from './StockOperationFeedback';
import { InventoryReviewSummary } from '../Orders/InventoryReviewSummary';
import { ProductPosOptionsDialog } from './ProductPosOptionsDialog';
import { StockOperationDialog } from './StockOperationDialog';
import { StockMovementsHistory } from './StockMovementsHistory';
import { AssignedFairStock } from './AssignedFairStock';

const formatDate = (timestamp: number) =>
 new Date(timestamp).toLocaleString('ro-RO', {
 dateStyle: 'medium',
 timeStyle: 'short',
 });

export const AdminInventory = () => {
 const { can, userId } = useStaffAccess();
 const canReadAll = can('inventory.readAll');
 const fairIdParam = useSearchParams()[0].get('fairId') as Id<'fairs'> | null;
 const overview = useAdminQuery(api.pos.getStockOverview, {});
 const archivedPreview = useAdminQuery(
 api.pos.getArchivePreview,
 canReadAll && fairIdParam ? { fairId: fairIdParam } : 'skip',
 );
 const operation = useInventoryOperation(userId ?? '');
 const stockOperation = useStockOperation(userId);
 if (!canReadAll) return <AssignedFairStock overview={overview.data} />;
 return (
 <InventoryWorkspace
 overview={overview.data}
 archivedPreview={archivedPreview.data}
 operation={operation}
 stockOperation={stockOperation}
 archivedFairId={fairIdParam}
 />
 );
};

interface WorkspaceProps {
 overview:
 | {
 scope: 'all' | 'assigned';
 issues: string[];
 fairs: InventoryFair[];
 products: InventoryProduct[];
 }
 | null
 | undefined;
 archivedPreview:
 | { fair: InventoryFair & { archivedAt?: number } }
 | null
 | undefined;
 operation: ReturnType<typeof useInventoryOperation>;
 stockOperation: ReturnType<typeof useStockOperation>;
 archivedFairId: Id<'fairs'> | null;
}

const InventoryWorkspace = ({
 overview,
 archivedPreview,
 operation,
 stockOperation,
 archivedFairId,
}: WorkspaceProps) => {
 const { can } = useStaffAccess();
 const thumbnails = useProductThumbnails();
 const [searchParams, setSearchParams] = useSearchParams();
 const [search, setSearch] = useState('');
 const [category, setCategory] = useState('');
 const [availability, setAvailability] = useState<StockAvailability>(() => {
   const value = searchParams.get('availability');
   return value === 'available' ||
     value === 'low' ||
     value === 'out' ||
     value === 'reserved'
     ? value
     : 'all';
 });
 const [stockDialogProduct, setStockDialogProduct] =
 useState<InventoryProduct | null>(null);
 const [optionsDialogProduct, setOptionsDialogProduct] =
 useState<InventoryProduct | null>(null);
 const [historyProduct, setHistoryProduct] = useState<Id<'products'> | null>(
 null,
 );

 const location: StockLocation = archivedFairId
 ? `fairs:${archivedFairId}`
 : searchParams.get('location') === 'workshop'
 ? 'workshop'
 : 'all';
 const setLocation = (value: StockLocation) => {
 const next = new URLSearchParams(searchParams);
 next.delete('fairId');
 next.delete('location');
 if (value === 'workshop') next.set('location', 'workshop');
 else if (locationFairId(value)) next.set('fairId', locationFairId(value)!);
 setSearchParams(next);
 };

 const categories = useMemo(
 () =>
 [
 ...new Set(
 (overview?.products ?? [])
 .map((product) => product.category)
 .filter(Boolean),
 ),
 ].sort(),
 [overview],
 );
 const filtered = useMemo(
 () =>
 filterStockRows(overview?.products ?? [], {
 term: search,
 location,
 category,
 availability,
 }),
 [overview, search, location, category, availability],
 );
 const selectedFair = locationFairId(location);
 const totalProducts = overview?.products.length ?? 0;
 const lowCount =
 overview?.products.filter((product) => {
 const atelier = locationStock(product, 'workshop');
 return (
 atelier.available !== null &&
 atelier.available <= (product.lowStockThreshold ?? 5)
 );
 }).length ?? 0;
 const invalidCount =
 overview?.products.filter((product) => product.invalidStock).length ?? 0;

 if (!overview)
 return <p className="text-sm text-muted-foreground">Se încarcă stocurile...</p>;
 const fairs = overview.fairs;

 return (
 <div>
 <div className="flex flex-wrap items-center justify-between gap-3">
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-foreground">Stocuri</h1>
 <div className="flex gap-2">
 {can('products.posOptions') ? (
 <Button
 asChild
 variant="outline"
 className="rounded-lg px-3"
 >
 <Link to="/admin/pos">Deschide POS</Link>
 </Button>
 ) : null}
 {can('fairs.manage') ? (
 <Button
 asChild
 variant="outline"
 className="rounded-lg px-3"
 >
 <Link to="/admin/fairs">Gestionează târgurile</Link>
 </Button>
 ) : null}
 {can('catalog.manage') ? (
 <Button
 asChild
 className="rounded-lg px-3"
 >
 <Link to="/admin/products/new">Produs nou</Link>
 </Button>
 ) : null}
 </div>
 </div>
 {archivedFairId && archivedPreview?.fair ? (
 <Alert variant="warning" className="mt-4">
 <AlertTitle>
 {archivedPreview.fair.name} este arhivat. Stocul de mai jos este
 istoric
 {archivedPreview.fair.archivedAt
 ? `, citit din chitanța de arhivare din ${formatDate(archivedPreview.fair.archivedAt)}.`
 : '.'}
 </AlertTitle>
 <AlertDescription className="text-xs text-amber-800 dark:text-amber-300 ">
 Stocul rămas a fost returnat online la arhivare.
 </AlertDescription>
 </Alert>
 ) : null}
 {!operation.online ? (
 <Alert variant="warning" role="status" className="mt-4">
 <AlertDescription>
 Fără conexiune la server. Operațiunile pe stoc sunt blocate până la
 reconectare.
 </AlertDescription>
 </Alert>
 ) : null}
 {overview.issues.length ? (
 <Alert variant="destructive" className="mt-4">
 <AlertTitle>
 Probleme de inventar ({overview.issues.length})
 </AlertTitle>
 <AlertDescription>
 <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800 dark:text-red-300 ">
 {overview.issues.map((issue) => (
 <li key={issue}>{issue}</li>
 ))}
 </ul>
 <p className="mt-2 text-xs text-red-700 dark:text-red-400 ">
 Corectează aceste evidențe înainte să te bazezi pe alte
 operațiuni.
 </p>
 </AlertDescription>
 </Alert>
 ) : null}
 <InventoryReviewSummary />
 <div className="mt-4 grid gap-4 md:grid-cols-3">
 <Card className="rounded-lg">
 <CardContent className="p-4">
 <dl>
 <dt className="text-sm text-muted-foreground">Produse</dt>
 <dd className="mt-1 text-xl font-semibold">{totalProducts}</dd>
 </dl>
 </CardContent>
 </Card>
 <Card className="rounded-lg">
 <CardContent className="p-4">
 <dl>
 <dt className="text-sm text-muted-foreground">Stoc scăzut</dt>
 <dd className="mt-1 text-xl font-semibold">{lowCount}</dd>
 </dl>
 </CardContent>
 </Card>
 <Card className="rounded-lg">
 <CardContent className="p-4">
 <dl>
 <dt className="text-sm text-muted-foreground">Stocuri invalide</dt>
 <dd className="mt-1 text-xl font-semibold">{invalidCount}</dd>
 </dl>
 </CardContent>
 </Card>
 </div>
 <div className="mt-6 grid gap-3 md:grid-cols-4">
 <Input
 type="search"
 placeholder="Caută după nume sau SKU…"
 value={search}
 onChange={(event) => setSearch(event.target.value)}
 className="h-auto w-full rounded-lg px-3 py-2"
 aria-label="Caută produse"
 />
 <OptionSelect
 value={location}
 onValueChange={(v) => setLocation(v as StockLocation)}
 wrapperClassName="w-full"
 className="rounded-lg px-3 py-2"
 aria-label="Locație"
 options={[
 { value: 'all', label: 'Toate locațiile' },
 { value: 'workshop', label: 'Atelier' },
 ...fairs.map((fair) => ({ value: `fairs:${fair._id}`, label: fair.name })),
 ]}
 />
 <OptionSelect
 value={category}
 onValueChange={(v) => setCategory(v)}
 wrapperClassName="w-full"
 className="rounded-lg px-3 py-2"
 aria-label="Categorie"
 options={[
 { value: '', label: 'Toate categoriile' },
 ...categories.map((item) => ({ value: item, label: item })),
 ]}
 />
 <OptionSelect
 value={availability}
 onValueChange={(v) =>
 setAvailability(v as StockAvailability)
 }
 wrapperClassName="w-full"
 className="rounded-lg px-3 py-2"
 aria-label="Disponibilitate"
 options={[
 { value: 'all', label: 'Orice disponibilitate' },
 { value: 'available', label: 'Disponibil' },
 { value: 'low', label: 'Stoc scăzut' },
 { value: 'out', label: 'Fără stoc' },
 { value: 'reserved', label: 'Cu rezervări' },
 ]}
 />
 </div>
 <div className="mt-4 overflow-x-auto">
 <Table className="min-w-full rounded-lg border border-border bg-card text-sm">
 <TableHeader className="bg-stone-50 dark:bg-stone-800 ">
 <TableRow className="hover:bg-stone-50 dark:hover:bg-stone-900">
 <TableHead className="px-3 py-2 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Produs
 </TableHead>
 <TableHead className="px-3 py-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Fizic
 </TableHead>
 <TableHead className="px-3 py-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Rezervat
 </TableHead>
 <TableHead className="px-3 py-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Disponibil
 </TableHead>
 {location === 'all' ? (
 <TableHead className="px-3 py-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 În tranzit
 </TableHead>
 ) : null}
 <TableHead className="px-3 py-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Prag minim (Atelier)
 </TableHead>
 <TableHead className="px-3 py-2 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Stare
 </TableHead>
 <TableHead className="px-3 py-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Acțiuni
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filtered.map((product) => {
 const rowStock = locationStock(product, location);
 const low =
 !product.invalidStock &&
 product.onlineStock !== null &&
 product.onlineStock <= (product.lowStockThreshold ?? 5);
 return (
 <TableRow key={product.id} className="hover:bg-transparent">
 <TableCell className="px-3 py-2">
 <div className="flex items-center gap-3">
 <ProductThumb
 src={thumbnails.get(product.id)}
 alt={product.name}
 />
 <div className="min-w-0">
 <p className="font-medium text-foreground">
 {product.name}
 {product.status === 'archived' ? (
 <Badge
 variant="stone"
 className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
 >
 Arhivat
 </Badge>
 ) : product.status === 'inactive' ? (
 <Badge
 variant="amber"
 className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
 >
 Inactiv
 </Badge>
 ) : null}
 </p>
 <p className="text-xs text-muted-foreground">
 {product.sku || 'Fără SKU'}
 {product.category ? ` · ${product.category}` : ''}
 </p>
 </div>
 </div>
 </TableCell>
 <TableCell className="px-3 py-2 text-right tabular-nums">
 {formatStock(rowStock.physical)}
 </TableCell>
 <TableCell className="px-3 py-2 text-right tabular-nums">
 {formatStock(rowStock.reserved)}
 </TableCell>
 <TableCell
 className={`px-3 py-2 text-right tabular-nums ${
 low && !selectedFair ? 'font-semibold text-amber-700 dark:text-amber-400 ' : ''
 }`}
 >
 {formatStock(rowStock.available)}
 </TableCell>
 {location === 'all' ? (
 <TableCell className="px-3 py-2 text-right tabular-nums">
 {formatStock(product.inTransitStock)}
 </TableCell>
 ) : null}
 <TableCell className="px-3 py-2 text-right tabular-nums text-stone-600 dark:text-stone-300 ">
 {product.lowStockThreshold ?? (
 <span>
 5 <span className="text-xs">(implicit)</span>
 </span>
 )}
 </TableCell>
 <TableCell className="px-3 py-2">
 {product.invalidStock ? (
 <span className="text-xs font-medium text-red-700 dark:text-red-400 ">
 Stoc invalid
 </span>
 ) : !product.trackStock ? (
 <span className="text-xs font-medium text-muted-foreground">
 Stoc neurmărit
 </span>
 ) : low ? (
 <span className="text-xs font-medium text-amber-700 dark:text-amber-400 ">
 Stoc scăzut
 </span>
 ) : (
 <span className="text-xs text-muted-foreground">OK</span>
 )}
 </TableCell>
 <TableCell className="px-3 py-2">
 <div className="flex flex-wrap justify-end gap-2">
 {can('inventory.adjust') ? (
 <Button
 type="button"
 variant="outline"
 size="xs"
 onClick={() => setStockDialogProduct(product)}
 disabled={product.invalidStock || !operation.online}
 >
 Stoc
 </Button>
 ) : null}
 <Button
 type="button"
 variant="outline"
 size="xs"
 onClick={() => setHistoryProduct(product.id)}
 >
 Istoric
 </Button>
 {can('transfers.execute') ? (
 <Button
 asChild
 variant="outline"
 size="xs"
 >
 <Link
 to={`/admin/transfers/new?productId=${product.id}&from=${selectedFair ?? 'workshop'}`}
 >
 Transfer
 </Link>
 </Button>
 ) : null}
 {can('products.posOptions') ? (
 <Button
 type="button"
 variant="outline"
 size="xs"
 onClick={() => setOptionsDialogProduct(product)}
 >
 Opțiuni POS
 </Button>
 ) : null}
 </div>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
 {filtered.length === 0 ? (
 <p className="mt-3 text-sm text-muted-foreground">
 Niciun produs nu corespunde căutării.
 </p>
 ) : null}
 {stockDialogProduct ? (
 <StockOperationDialog
 product={stockDialogProduct}
 fairs={fairs}
 operation={stockOperation}
 onClose={() => setStockDialogProduct(null)}
 />
 ) : null}
 {optionsDialogProduct ? (
 <ProductPosOptionsDialog
 product={optionsDialogProduct}
 online={operation.online}
 onClose={() => setOptionsDialogProduct(null)}
 />
 ) : null}
 <InventoryFeedback operation={operation} />
 <StockOperationFeedback operation={stockOperation} />
 <StockMovementsHistory location={location} productId={historyProduct} />
 </div>
 );
};

import { useMemo, useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';
import {
 filterStockRows,
 formatStock,
} from '../../../utils/inventory.utils';
import type { StockAvailability } from '../../../utils/inventory.utils';
import type { InventoryProduct } from '../../../types/inventory.types';
import { useProductThumbnails } from '../../../hooks/useProductThumbnails';
import { ProductThumb } from '../../../components/ProductThumb';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OptionSelect } from '../../../components/OptionSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { StockMovementsHistory } from './StockMovementsHistory';

interface AssignedFairStockProps {
 overview:
 | {
 scope: 'all' | 'assigned';
 fairs: { _id: Id<'fairs'>; name: string }[];
 products: InventoryProduct[];
 }
 | null
 | undefined;
}

export const AssignedFairStock = ({ overview }: AssignedFairStockProps) => {
 const thumbnails = useProductThumbnails();
 const [fairId, setFairId] = useState<Id<'fairs'> | ''>('');
 const [search, setSearch] = useState('');
 const [category, setCategory] = useState('');
 const [availability, setAvailability] = useState<StockAvailability>('all');
 const [historyProduct, setHistoryProduct] = useState<Id<'products'> | null>(
 null,
 );

 const selectedFair = fairId || overview?.fairs[0]?._id || '';
 const location = selectedFair
 ? (`fairs:${selectedFair}` as const)
 : 'all';
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

 if (!overview) {
 return <p className="text-sm text-muted-foreground">Se încarcă stocurile...</p>;
 }

 return (
 <div>
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-foreground">Stocuri</h1>
 <p className="mt-1 text-sm text-muted-foreground">
 Vezi doar stocul de la târgurile alocate. Alocările și transferurile se
 fac de către echipa de atelier.
 </p>
 {overview.fairs.length === 0 ? (
 <Alert variant="warning" className="mt-4 text-amber-800 dark:text-amber-300 ">
 <AlertDescription>
 Nu ai târguri active alocate. Cere administratorului alocarea.
 </AlertDescription>
 </Alert>
 ) : null}
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
 value={selectedFair}
 onValueChange={(v) => setFairId(v as Id<'fairs'>)}
 wrapperClassName="w-full"
 className="rounded-lg px-3 py-2"
 aria-label="Târg"
 options={overview.fairs.map((fair) => ({ value: fair._id, label: fair.name }))}
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
 { value: 'out', label: 'Fără stoc' },
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
 <TableHead className="px-3 py-2 text-left font-medium text-stone-600 dark:text-stone-300 ">
 SKU
 </TableHead>
 <TableHead className="px-3 py-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Fizic
 </TableHead>
 <TableHead className="px-3 py-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Disponibil
 </TableHead>
 <TableHead className="px-3 py-2 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Acțiuni
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filtered.map((product) => {
 const quantity =
 product.fairs.find((row) => row.fairId === selectedFair)
 ?.quantity ?? 0;
 return (
 <TableRow key={product.id} className="hover:bg-transparent">
 <TableCell className="px-3 py-2">
 <div className="flex items-center gap-3">
 <ProductThumb
 src={thumbnails.get(product.id)}
 alt={product.name}
 />
 <div className="min-w-0">
 <p className="font-medium text-foreground">{product.name}</p>
 <p className="text-xs text-muted-foreground">{product.category}</p>
 </div>
 </div>
 </TableCell>
 <TableCell className="px-3 py-2 text-stone-600 dark:text-stone-300 ">
 {product.sku || '—'}
 </TableCell>
 <TableCell className="px-3 py-2 text-right tabular-nums">
 {formatStock(product.invalidStock ? null : quantity)}
 </TableCell>
 <TableCell className="px-3 py-2 text-right tabular-nums">
 {formatStock(product.invalidStock ? null : quantity)}
 </TableCell>
 <TableCell className="px-3 py-2 text-right">
 <Button
 type="button"
 variant="outline"
 size="xs"
 onClick={() => setHistoryProduct(product.id)}
 >
 Istoric
 </Button>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
 {selectedFair ? (
 <StockMovementsHistory
 location={`fairs:${selectedFair}`}
 productId={historyProduct}
 />
 ) : null}
 </div>
 );
};

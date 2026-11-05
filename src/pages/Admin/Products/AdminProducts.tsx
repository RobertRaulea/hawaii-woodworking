import type React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Doc } from '../../../../convex/_generated/dataModel';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { ProductThumb } from '../../../components/ProductThumb';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Empty } from '@/components/ui/empty';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OptionSelect } from '../../../components/OptionSelect';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { inventoryError } from '../../../utils/inventory.utils';

type AdminProduct = Doc<'products'> & {
 status: 'active' | 'inactive' | 'archived';
 imageUrls: (string | null)[];
};

type StatusFilter = 'visible' | 'active' | 'inactive' | 'archived';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<AdminProduct['status'], string> = {
 active: 'Activ',
 inactive: 'Inactiv',
 archived: 'Arhivat',
};

const STATUS_BADGES: Record<
 AdminProduct['status'],
 'emerald' | 'amber' | 'stone'
> = {
 active: 'emerald',
 inactive: 'amber',
 archived: 'stone',
};

export const AdminProducts: React.FC = () => {
 const products = useQuery(api.products.listAdmin);
 const setProductActive = useMutation(api.products.setProductActive);
 const archiveProduct = useMutation(api.products.archiveProduct);
 const restoreProduct = useMutation(api.products.restoreProduct);
 const deleteProduct = useMutation(api.products.deleteProduct);

 const [search, setSearch] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('');
 const [statusFilter, setStatusFilter] = useState<StatusFilter>('visible');
 const [page, setPage] = useState(0);
 const [actionError, setActionError] = useState<string | null>(null);
 const [archiving, setArchiving] = useState<AdminProduct | null>(null);
 const [deleting, setDeleting] = useState<AdminProduct | null>(null);
 const [busy, setBusy] = useState(false);

 const categories = useMemo(
 () =>
 [
 ...new Set(
 (products ?? [])
 .map((product) => product.category)
 .filter((name): name is string => Boolean(name)),
 ),
 ].sort(),
 [products],
 );

 const filtered = useMemo(() => {
 const term = search.trim().toLowerCase();
 return (products ?? []).filter((product) => {
 if (statusFilter === 'visible' && product.status === 'archived')
 return false;
 if (statusFilter !== 'visible' && product.status !== statusFilter)
 return false;
 if (categoryFilter && product.category !== categoryFilter) return false;
 if (
 term &&
 !product.name.toLowerCase().includes(term) &&
 !(product.sku ?? '').toLowerCase().includes(term)
 )
 return false;
 return true;
 });
 }, [products, search, categoryFilter, statusFilter]);

 const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
 const currentPage = Math.min(page, pageCount - 1);
 const visible = filtered.slice(
 currentPage * PAGE_SIZE,
 (currentPage + 1) * PAGE_SIZE,
 );

 const run = async (action: () => Promise<unknown>) => {
 setActionError(null);
 setBusy(true);
 try {
 await action();
 return true;
 } catch (err) {
 setActionError(inventoryError(err));
 return false;
 } finally {
 setBusy(false);
 }
 };

 const toggleActive = (product: AdminProduct) =>
 run(() =>
 setProductActive({ id: product._id, active: product.status !== 'active' }),
 );

 const confirmArchive = async () => {
 if (!archiving) return;
 const ok = await run(() => archiveProduct({ id: archiving._id }));
 if (ok) setArchiving(null);
 };

 const confirmRestore = (product: AdminProduct) =>
 run(() => restoreProduct({ id: product._id }));

 const confirmDelete = async () => {
 if (!deleting) return;
 const ok = await run(() => deleteProduct({ id: deleting._id }));
 if (ok) setDeleting(null);
 };

 if (products === undefined) {
 return (
 <div className="flex items-center justify-center py-20">
 <p className="text-muted-foreground">Se încarcă produsele...</p>
 </div>
 );
 }

 return (
 <section>
 <div className="mb-6 flex items-center justify-between">
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-foreground">Produse</h1>
 <Button variant="brand"
 asChild
 className="rounded-lg py-2.5"
 >
 <Link to="/admin/products/new">
 <Plus className="size-4" />
 Adaugă produs
 </Link>
 </Button>
 </div>

 {actionError ? (
 <Alert variant="destructive" className="mb-4">
 <AlertDescription>{actionError}</AlertDescription>
 </Alert>
 ) : null}

 {products.length === 0 ? (
 <Empty className="gap-0 flex-initial rounded-lg border border-dashed border-stone-300 dark:border-stone-700 bg-card p-12 text-center">
 <p className="mb-4 text-muted-foreground">Nu există produse încă.</p>
 <Button
 asChild
 variant="link"
 className="gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-400"
 >
 <Link to="/admin/products/new">
 <Plus className="size-4" />
 Adaugă primul produs
 </Link>
 </Button>
 </Empty>
 ) : (
 <>
 <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
 <Input
 type="search"
 value={search}
 onChange={(e) => {
 setSearch(e.target.value);
 setPage(0);
 }}
 placeholder="Caută după nume sau SKU..."
 className="h-auto w-full rounded-lg px-3 py-2.5"
 />
 <OptionSelect
 aria-label="Categorie"
 value={categoryFilter}
 onValueChange={(v) => {
 setCategoryFilter(v);
 setPage(0);
 }}
 className="rounded-lg px-3 py-2.5"
 options={[
 { value: '', label: 'Toate categoriile' },
 ...categories.map((name) => ({ value: name, label: name })),
 ]}
 />
 <OptionSelect
 aria-label="Stare"
 value={statusFilter}
 onValueChange={(v) => {
 setStatusFilter(v as StatusFilter);
 setPage(0);
 }}
 className="rounded-lg px-3 py-2.5"
 options={[
 { value: 'visible', label: 'Toate (fără arhivate)' },
 { value: 'active', label: 'Activ' },
 { value: 'inactive', label: 'Inactiv' },
 { value: 'archived', label: 'Arhivat' },
 ]}
 />
 </div>

 <div className="overflow-x-auto rounded-lg border border-border bg-card">
 <Table className="w-full text-sm">
 <TableHeader>
 <TableRow className="bg-stone-50 dark:bg-stone-800 ">
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Imagine
 </TableHead>
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Nume
 </TableHead>
 <TableHead className="hidden px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 md:table-cell">
 Categorie
 </TableHead>
 <TableHead className="px-4 py-3 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Preț
 </TableHead>
 <TableHead className="hidden px-4 py-3 text-center font-medium text-stone-600 dark:text-stone-300 lg:table-cell">
 Stoc
 </TableHead>
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 ">
 Stare
 </TableHead>
 <TableHead className="px-4 py-3 text-right font-medium text-stone-600 dark:text-stone-300 ">
 Acțiuni
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {visible.map((product) => (
 <TableRow
 key={product._id}
 className="transition-colors last:border-b-0 hover:bg-stone-50 dark:hover:bg-stone-900"
 >
 <TableCell className="px-4 py-3">
 <ProductThumb
 src={product.imageUrls?.[0]}
 alt={product.name}
 />
 </TableCell>
 <TableCell className="px-4 py-3">
 <p className="font-medium text-foreground">
 {product.name}
 </p>
 <p className="text-xs text-muted-foreground">
 {product.sku || 'Fără SKU'}
 </p>
 </TableCell>
 <TableCell className="hidden px-4 py-3 text-muted-foreground md:table-cell">
 {product.category ?? '—'}
 </TableCell>
 <TableCell className="px-4 py-3 text-right text-stone-700 dark:text-stone-300 ">
 {product.price.toFixed(2)} RON
 </TableCell>
 <TableCell className="hidden px-4 py-3 text-center lg:table-cell">
 {product.trackStock === false ? (
 <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
 <Package className="h-3.5 w-3.5" />
 Nelimitat
 </span>
 ) : (
 <Button
 asChild
 variant="ghost"
 size="sm"
 className="h-auto gap-1.5 rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-200 hover:text-green-700 dark:hover:text-green-400"
 >
 <Link to="/admin/inventory">
 {product.stock ?? 0}
 </Link>
 </Button>
 )}
 </TableCell>
 <TableCell className="px-4 py-3">
 <Badge
 variant={STATUS_BADGES[product.status]}
 >
 {STATUS_LABELS[product.status]}
 </Badge>
 </TableCell>
 <TableCell className="px-4 py-3 text-right">
 <div className="flex items-center justify-end gap-2">
 <Button
 asChild
 variant="ghost"
 size="sm"
 className="gap-1 px-2.5 text-xs font-medium"
 >
 <Link to={`/admin/products/${product._id}`}>
 <Pencil className="h-3.5 w-3.5" />
 Editează
 </Link>
 </Button>
 {product.status === 'archived' ? (
 <Button
 type="button"
 variant="ghost"
 size="sm"
 disabled={busy}
 onClick={() => confirmRestore(product)}
 className="gap-1 px-2.5 text-xs font-medium"
 >
 Restaurează
 </Button>
 ) : (
 <>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 disabled={busy}
 onClick={() => toggleActive(product)}
 className="gap-1 px-2.5 text-xs font-medium"
 >
 {product.status === 'active'
 ? 'Dezactivează'
 : 'Activează'}
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 disabled={busy}
 onClick={() => {
 setActionError(null);
 setArchiving(product);
 }}
 className="gap-1 px-2.5 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-800 dark:hover:text-amber-300"
 >
 Arhivează
 </Button>
 </>
 )}
 <Button
 type="button"
 variant="ghost"
 size="sm"
 disabled={busy}
 onClick={() => {
 setActionError(null);
 setDeleting(product);
 }}
 className="gap-1 px-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400"
 >
 <Trash2 className="h-3.5 w-3.5" />
 Șterge
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 {visible.length === 0 ? (
 <TableRow>
 <TableCell
 colSpan={7}
 className="px-4 py-10 text-center text-muted-foreground"
 >
 Niciun produs nu corespunde filtrelor.
 </TableCell>
 </TableRow>
 ) : null}
 </TableBody>
 </Table>
 </div>

 {pageCount > 1 ? (
 <div className="mt-4 flex items-center justify-between">
 <Button
 type="button"
 variant="outline"
 disabled={currentPage === 0}
 onClick={() => setPage(currentPage - 1)}
 className="rounded-lg"
 >
 Înapoi
 </Button>
 <p className="text-sm text-muted-foreground">
 Pagina {currentPage + 1} din {pageCount}
 </p>
 <Button
 type="button"
 variant="outline"
 disabled={currentPage >= pageCount - 1}
 onClick={() => setPage(currentPage + 1)}
 className="rounded-lg"
 >
 Înainte
 </Button>
 </div>
 ) : null}
 </>
 )}

 {archiving ? (
 <AdminDialog
 title="Arhivează produs"
 onClose={() => setArchiving(null)}
 >
 <p className="text-sm leading-6 text-stone-600 dark:text-stone-300 ">
 Arhivezi „{archiving.name}”? Produsul dispare din magazin și POS, iar
 stocul rămas devine informativ.
 </p>
 {actionError ? (
 <Alert variant="destructive" className="mt-3">
 <AlertDescription>{actionError}</AlertDescription>
 </Alert>
 ) : null}
 <div className="mt-5 flex justify-end gap-2">
 <Button
 type="button"
 variant="ghost"
 onClick={() => setArchiving(null)}
 className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 dark:text-stone-300 "
 >
 Anulează
 </Button>
 <Button
 type="button"
 disabled={busy}
 onClick={confirmArchive}
 className="rounded-lg px-4 py-2.5 text-sm font-semibold"
 >
 {busy ? 'Se arhivează...' : 'Arhivează'}
 </Button>
 </div>
 </AdminDialog>
 ) : null}

 {deleting ? (
 <AdminDialog
 title="Șterge produs"
 onClose={() => setDeleting(null)}
 >
 <p className="text-sm leading-6 text-stone-600 dark:text-stone-300 ">
 Ștergi definitiv „{deleting.name}”? Acțiunea este permisă doar pentru
 produse fără istoric și nu poate fi anulată.
 </p>
 {actionError ? (
 <Alert variant="destructive" className="mt-3">
 <AlertDescription>{actionError}</AlertDescription>
 </Alert>
 ) : null}
 <div className="mt-5 flex justify-end gap-2">
 <Button
 type="button"
 variant="ghost"
 onClick={() => setDeleting(null)}
 className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 dark:text-stone-300 "
 >
 Anulează
 </Button>
 <Button
 type="button"
 variant="destructive"
 disabled={busy}
 onClick={confirmDelete}
 className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-700"
 >
 {busy ? 'Se șterge...' : 'Șterge'}
 </Button>
 </div>
 </AdminDialog>
 ) : null}
 </section>
 );
};

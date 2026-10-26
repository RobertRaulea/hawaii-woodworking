import type React from 'react';
import { useMemo, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { inventoryError } from '../../../utils/inventory.utils';

export const AdminCategories: React.FC = () => {
 const categories = useQuery(api.categories.getAll);
 const products = useQuery(api.products.listAdmin);
 const createCategory = useMutation(api.categories.create);
 const updateCategory = useMutation(api.categories.update);
 const removeCategory = useMutation(api.categories.remove);

 const [newCategoryName, setNewCategoryName] = useState('');
 const [isAdding, setIsAdding] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editingName, setEditingName] = useState('');
 const [deletingId, setDeletingId] = useState<string | null>(null);
 const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);

 const productCountByCategory = useMemo(() => {
 const counts = new Map<string, number>();
 for (const product of products ?? []) {
 if (!product.category) continue;
 counts.set(
 product.category,
 (counts.get(product.category) ?? 0) + 1,
 );
 }
 return counts;
 }, [products]);

 const handleCreate = async () => {
 if (!newCategoryName.trim()) return;

 setError(null);
 setIsAdding(true);

 try {
 await createCategory({ name: newCategoryName.trim() });
 setNewCategoryName('');
 } catch (err) {
 setError(inventoryError(err));
 } finally {
 setIsAdding(false);
 }
 };

 const handleUpdate = async (id: string) => {
 if (!editingName.trim()) return;

 setError(null);

 try {
 await updateCategory({ id: id as Id<'categories'>, name: editingName.trim() });
 setEditingId(null);
 setEditingName('');
 } catch (err) {
 setError(inventoryError(err));
 }
 };

 const handleDelete = async (id: string) => {
 setError(null);
 setDeletingId(id);

 try {
 await removeCategory({ id: id as Id<'categories'> });
 } catch (err) {
 setError(inventoryError(err));
 } finally {
 setDeletingId(null);
 setConfirmDeleteId(null);
 }
 };

 const startEditing = (id: string, name: string) => {
 setEditingId(id);
 setEditingName(name);
 setError(null);
 };

 const cancelEditing = () => {
 setEditingId(null);
 setEditingName('');
 };

 if (categories === undefined) {
 return (
 <div className="flex items-center justify-center py-20">
 <p className="text-stone-500 dark:text-stone-400 ">Se încarcă categoriile...</p>
 </div>
 );
 }

 return (
 <section>
 <div className="mb-6 flex items-center justify-between">
 <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 ">Categorii</h1>
 </div>

 {error && (
 <Alert variant="destructive" className="mb-4">
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 )}

 <div className="mb-6">
 <div className="flex gap-2">
 <Input
 type="text"
 value={newCategoryName}
 onChange={(e) => setNewCategoryName(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
 placeholder="Numele categoriei noi"
 className="h-auto flex-1 rounded-lg px-3 py-2.5"
 />
 <Button
 onClick={handleCreate}
 disabled={isAdding || !newCategoryName.trim()}
 className="gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium hover:bg-amber-700"
 >
 <Plus className="h-4 w-4" />
 {isAdding ? 'Se adaugă...' : 'Adaugă'}
 </Button>
 </div>
 </div>

 {categories.length === 0 ? (
 <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-12 text-center">
 <p className="text-stone-500 dark:text-stone-400 ">Nu există categorii încă. Adaugă prima categorie mai sus.</p>
 </div>
 ) : (
 <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 ">
 <Table className="w-full text-sm">
 <TableHeader>
 <TableRow className="bg-stone-50 dark:bg-stone-800 ">
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 ">Nume</TableHead>
 <TableHead className="hidden px-4 py-3 text-right font-medium text-stone-600 dark:text-stone-300md:table-cell">Produse</TableHead>
 <TableHead className="px-4 py-3 text-right font-medium text-stone-600 dark:text-stone-300 ">Acțiuni</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {categories.map((category) => {
 const used = (productCountByCategory.get(category.name) ?? 0) > 0;
 const usedTitle = used
 ? 'Categoria este folosită de produse; poți modifica doar traducerile.'
 : undefined;
 return (
 <TableRow
 key={category._id}
 className="transition-colors last:border-b-0 hover:bg-stone-50 dark:hover:bg-stone-900"
 >
 <TableCell className="px-4 py-3">
 {editingId === category._id ? (
 <Input
 type="text"
 value={editingName}
 onChange={(e) => setEditingName(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') handleUpdate(category._id);
 if (e.key === 'Escape') cancelEditing();
 }}
 className="h-auto w-full px-2 py-1"
 autoFocus
 />
 ) : (
 <span className="font-medium text-stone-900 dark:text-stone-50 ">{category.name}</span>
 )}
 {used ? (
 <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 ">
 Folosită de produse — redenumirea este blocată.
 </p>
 ) : null}
 </TableCell>
 <TableCell className="hidden px-4 py-3 text-right text-stone-600 dark:text-stone-300md:table-cell">
 {productCountByCategory.get(category.name) ?? 0}
 </TableCell>
 <TableCell className="px-4 py-3 text-right">
 <div className="flex items-center justify-end gap-2">
 {editingId === category._id ? (
 <>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleUpdate(category._id)}
 className="gap-1 px-2.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/60 hover:text-green-600 dark:hover:text-green-400"
 >
 <Check className="h-3.5 w-3.5" />
 Salvează
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={cancelEditing}
 className="gap-1 px-2.5 text-xs font-medium text-stone-500 dark:text-stone-400hover:text-stone-500 dark:hover:text-stone-400:"
 >
 <X className="h-3.5 w-3.5" />
 Anulează
 </Button>
 </>
 ) : (
 <>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => startEditing(category._id, category.name)}
 disabled={used}
 title={usedTitle}
 className="gap-1 px-2.5 text-xs font-medium"
 >
 <Pencil className="h-3.5 w-3.5" />
 Redenumește
 </Button>

 {confirmDeleteId === category._id ? (
 <div className="flex items-center gap-1">
 <Button
 variant="destructive"
 size="sm"
 onClick={() => handleDelete(category._id)}
 disabled={deletingId === category._id}
 className="bg-red-600 px-2.5 text-xs font-medium hover:bg-red-700"
 >
 {deletingId === category._id ? 'Se șterge...' : 'Confirmă'}
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setConfirmDeleteId(null)}
 className="px-2.5 text-xs font-medium text-stone-500 dark:text-stone-400hover:text-stone-500 dark:hover:text-stone-400:"
 >
 Anulează
 </Button>
 </div>
 ) : (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setConfirmDeleteId(category._id)}
 disabled={used}
 title={usedTitle}
 className="gap-1 px-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400"
 >
 <Trash2 className="h-3.5 w-3.5" />
 Șterge
 </Button>
 )}
 </>
 )}
 </div>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
 )}
 </section>
 );
};

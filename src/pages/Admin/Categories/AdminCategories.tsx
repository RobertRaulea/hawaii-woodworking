import type React from 'react';
import { useMemo, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
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
        <p className="text-stone-500">Se încarcă categoriile...</p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Categorii</h1>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Numele categoriei noi"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={handleCreate}
            disabled={isAdding || !newCategoryName.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isAdding ? 'Se adaugă...' : 'Adaugă'}
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-12 text-center">
          <p className="text-stone-500">Nu există categorii încă. Adaugă prima categorie mai sus.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 text-left font-medium text-stone-600">Nume</th>
                <th className="hidden px-4 py-3 text-right font-medium text-stone-600 md:table-cell">Produse</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const used = (productCountByCategory.get(category.name) ?? 0) > 0;
                const usedTitle = used
                  ? 'Categoria este folosită de produse; poți modifica doar traducerile.'
                  : undefined;
                return (
                  <tr
                    key={category._id}
                    className="border-b border-stone-100 transition-colors last:border-b-0 hover:bg-stone-50"
                  >
                    <td className="px-4 py-3">
                      {editingId === category._id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(category._id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="w-full rounded-md border border-stone-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-stone-900">{category.name}</span>
                      )}
                      {used ? (
                        <p className="mt-1 text-xs text-stone-500">
                          Folosită de produse — redenumirea este blocată.
                        </p>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-stone-600 md:table-cell">
                      {productCountByCategory.get(category.name) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === category._id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(category._id)}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Salvează
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100"
                            >
                              <X className="h-3.5 w-3.5" />
                              Anulează
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(category._id, category.name)}
                              disabled={used}
                              title={usedTitle}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Redenumește
                            </button>

                            {confirmDeleteId === category._id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(category._id)}
                                  disabled={deletingId === category._id}
                                  className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                >
                                  {deletingId === category._id ? 'Se șterge...' : 'Confirmă'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100"
                                >
                                  Anulează
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(category._id)}
                                disabled={used}
                                title={usedTitle}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Șterge
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

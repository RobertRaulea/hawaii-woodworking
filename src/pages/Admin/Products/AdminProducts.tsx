import { useQuery, useMutation } from 'convex/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

export const AdminProducts: React.FC = () => {
  const products = useQuery(api.products.getAll);
  const deleteProduct = useMutation(api.products.deleteProduct);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteProduct({ id: id as Id<'products'> });
    } catch (err) {
      console.error('Failed to delete product:', err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (products === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading products...</p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Products</h1>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-12 text-center">
          <p className="text-stone-500 mb-4">No products yet.</p>
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            Create your first product
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 text-left font-medium text-stone-600">Image</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600 hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">Price</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product._id}
                  className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    {product.imageUrls?.[0] ? (
                      <img
                        src={product.imageUrls[0]}
                        alt={product.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-stone-200 flex items-center justify-center">
                        <span className="text-xs text-stone-400">N/A</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-stone-900">{product.name}</td>
                  <td className="px-4 py-3 text-stone-500 hidden md:table-cell">
                    {product.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {product.price.toFixed(2)} RON
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/products/${product._id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>

                      {confirmDeleteId === product._id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(product._id)}
                            disabled={deletingId === product._id}
                            className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {deletingId === product._id ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(product._id)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

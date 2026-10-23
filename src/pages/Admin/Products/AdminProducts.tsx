import type React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Doc } from '../../../../convex/_generated/dataModel';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
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

const STATUS_BADGES: Record<AdminProduct['status'], string> = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-amber-100 text-amber-800',
  archived: 'bg-stone-200 text-stone-600',
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
        <p className="text-stone-500">Se încarcă produsele...</p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Produse</h1>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" />
          Adaugă produs
        </Link>
      </div>

      {actionError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      ) : null}

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-12 text-center">
          <p className="mb-4 text-stone-500">Nu există produse încă.</p>
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            <Plus className="h-4 w-4" />
            Adaugă primul produs
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Caută după nume sau SKU..."
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <select
              aria-label="Categorie"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Toate categoriile</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              aria-label="Stare"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(0);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="visible">Toate (fără arhivate)</option>
              <option value="active">Activ</option>
              <option value="inactive">Inactiv</option>
              <option value="archived">Arhivat</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-4 py-3 text-left font-medium text-stone-600">
                    Imagine
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-stone-600">
                    Nume
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-stone-600 md:table-cell">
                    Categorie
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-stone-600">
                    Preț
                  </th>
                  <th className="hidden px-4 py-3 text-center font-medium text-stone-600 lg:table-cell">
                    Stoc
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-stone-600">
                    Stare
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-stone-600">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => (
                  <tr
                    key={product._id}
                    className="border-b border-stone-100 transition-colors last:border-b-0 hover:bg-stone-50"
                  >
                    <td className="px-4 py-3">
                      {product.imageUrls?.[0] ? (
                        <img
                          src={product.imageUrls[0]}
                          alt={product.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-stone-200">
                          <span className="text-xs text-stone-400">N/A</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {product.sku || 'Fără SKU'}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-stone-500 md:table-cell">
                      {product.category ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-700">
                      {product.price.toFixed(2)} RON
                    </td>
                    <td className="hidden px-4 py-3 text-center lg:table-cell">
                      {product.trackStock === false ? (
                        <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                          <Package className="h-3.5 w-3.5" />
                          Nelimitat
                        </span>
                      ) : (
                        <Link
                          to="/admin/inventory"
                          className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                        >
                          {product.stock ?? 0}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGES[product.status]}`}
                      >
                        {STATUS_LABELS[product.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/products/${product._id}`}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editează
                        </Link>
                        {product.status === 'archived' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => confirmRestore(product)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-50"
                          >
                            Restaurează
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => toggleActive(product)}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-50"
                            >
                              {product.status === 'active'
                                ? 'Dezactivează'
                                : 'Activează'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setActionError(null);
                                setArchiving(product);
                              }}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-50 disabled:opacity-50"
                            >
                              Arhivează
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setActionError(null);
                            setDeleting(product);
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Șterge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-stone-500"
                    >
                      Niciun produs nu corespunde filtrelor.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {pageCount > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
              >
                Înapoi
              </button>
              <p className="text-sm text-stone-500">
                Pagina {currentPage + 1} din {pageCount}
              </p>
              <button
                type="button"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
              >
                Înainte
              </button>
            </div>
          ) : null}
        </>
      )}

      {archiving ? (
        <AdminDialog
          title="Arhivează produs"
          onClose={() => setArchiving(null)}
        >
          <p className="text-sm leading-6 text-stone-600">
            Arhivezi „{archiving.name}”? Produsul dispare din magazin și POS, iar
            stocul rămas devine informativ.
          </p>
          {actionError ? (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {actionError}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setArchiving(null)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Anulează
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={confirmArchive}
              className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {busy ? 'Se arhivează...' : 'Arhivează'}
            </button>
          </div>
        </AdminDialog>
      ) : null}

      {deleting ? (
        <AdminDialog
          title="Șterge produs"
          onClose={() => setDeleting(null)}
        >
          <p className="text-sm leading-6 text-stone-600">
            Ștergi definitiv „{deleting.name}”? Acțiunea este permisă doar pentru
            produse fără istoric și nu poate fi anulată.
          </p>
          {actionError ? (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {actionError}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Anulează
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={confirmDelete}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? 'Se șterge...' : 'Șterge'}
            </button>
          </div>
        </AdminDialog>
      ) : null}
    </section>
  );
};

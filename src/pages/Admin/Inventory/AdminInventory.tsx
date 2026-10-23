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
import { useInventoryOperation } from '../../../hooks/useInventoryOperation';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { useStockOperation } from '../../../hooks/useStockOperation';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState<StockAvailability>('all');
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
    return <p className="text-sm text-stone-500">Se încarcă stocurile...</p>;
  const fairs = overview.fairs;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Stocuri</h1>
        <div className="flex gap-2">
          {can('products.posOptions') ? (
            <Link
              to="/admin/pos"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Deschide POS
            </Link>
          ) : null}
          {can('fairs.manage') ? (
            <Link
              to="/admin/fairs"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Gestionează târgurile
            </Link>
          ) : null}
          {can('catalog.manage') ? (
            <Link
              to="/admin/products/new"
              className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              Produs nou
            </Link>
          ) : null}
        </div>
      </div>
      {archivedFairId && archivedPreview?.fair ? (
        <section className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">
            {archivedPreview.fair.name} este arhivat. Stocul de mai jos este
            istoric
            {archivedPreview.fair.archivedAt
              ? `, citit din chitanța de arhivare din ${formatDate(archivedPreview.fair.archivedAt)}.`
              : '.'}
          </h2>
          <p className="mt-1 text-xs text-amber-800">
            Stocul rămas a fost returnat online la arhivare.
          </p>
        </section>
      ) : null}
      {!operation.online ? (
        <p
          role="status"
          className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          Fără conexiune la server. Operațiunile pe stoc sunt blocate până la
          reconectare.
        </p>
      ) : null}
      {overview.issues.length ? (
        <section className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-900">
            Probleme de inventar ({overview.issues.length})
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
            {overview.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-red-700">
            Corectează aceste evidențe înainte să te bazezi pe alte operațiuni.
          </p>
        </section>
      ) : null}
      <InventoryReviewSummary />
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <dl className="rounded-lg border border-stone-200 bg-white p-4">
          <dt className="text-sm text-stone-500">Produse</dt>
          <dd className="mt-1 text-xl font-semibold">{totalProducts}</dd>
        </dl>
        <dl className="rounded-lg border border-stone-200 bg-white p-4">
          <dt className="text-sm text-stone-500">Stoc scăzut</dt>
          <dd className="mt-1 text-xl font-semibold">{lowCount}</dd>
        </dl>
        <dl className="rounded-lg border border-stone-200 bg-white p-4">
          <dt className="text-sm text-stone-500">Stocuri invalide</dt>
          <dd className="mt-1 text-xl font-semibold">{invalidCount}</dd>
        </dl>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <input
          type="search"
          placeholder="Caută după nume sau SKU…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          aria-label="Caută produse"
        />
        <select
          value={location}
          onChange={(event) => setLocation(event.target.value as StockLocation)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          aria-label="Locație"
        >
          <option value="all">Toate locațiile</option>
          <option value="workshop">Atelier</option>
          {fairs.map((fair) => (
            <option key={fair._id} value={`fairs:${fair._id}`}>
              {fair.name}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          aria-label="Categorie"
        >
          <option value="">Toate categoriile</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={availability}
          onChange={(event) =>
            setAvailability(event.target.value as StockAvailability)
          }
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          aria-label="Disponibilitate"
        >
          <option value="all">Orice disponibilitate</option>
          <option value="available">Disponibil</option>
          <option value="low">Stoc scăzut</option>
          <option value="out">Fără stoc</option>
          <option value="reserved">Cu rezervări</option>
        </select>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-stone-600">
                Produs
              </th>
              <th className="px-3 py-2 text-right font-medium text-stone-600">
                Fizic
              </th>
              <th className="px-3 py-2 text-right font-medium text-stone-600">
                Rezervat
              </th>
              <th className="px-3 py-2 text-right font-medium text-stone-600">
                Disponibil
              </th>
              {location === 'all' ? (
                <th className="px-3 py-2 text-right font-medium text-stone-600">
                  În tranzit
                </th>
              ) : null}
              <th className="px-3 py-2 text-right font-medium text-stone-600">
                Prag minim (Atelier)
              </th>
              <th className="px-3 py-2 text-left font-medium text-stone-600">
                Stare
              </th>
              <th className="px-3 py-2 text-right font-medium text-stone-600">
                Acțiuni
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((product) => {
              const rowStock = locationStock(product, location);
              const low =
                !product.invalidStock &&
                product.onlineStock !== null &&
                product.onlineStock <= (product.lowStockThreshold ?? 5);
              return (
                <tr key={product.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-stone-900">
                      {product.name}
                      {product.status === 'archived' ? (
                        <span className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-stone-600">
                          Arhivat
                        </span>
                      ) : product.status === 'inactive' ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-800">
                          Inactiv
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-stone-500">
                      {product.sku || 'Fără SKU'}
                      {product.category ? ` · ${product.category}` : ''}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatStock(rowStock.physical)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatStock(rowStock.reserved)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      low && !selectedFair ? 'font-semibold text-amber-700' : ''
                    }`}
                  >
                    {formatStock(rowStock.available)}
                  </td>
                  {location === 'all' ? (
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatStock(product.inTransitStock)}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-right tabular-nums text-stone-600">
                    {product.lowStockThreshold ?? (
                      <span>
                        5 <span className="text-xs">(implicit)</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {product.invalidStock ? (
                      <span className="text-xs font-medium text-red-700">
                        Stoc invalid
                      </span>
                    ) : !product.trackStock ? (
                      <span className="text-xs font-medium text-stone-500">
                        Stoc neurmărit
                      </span>
                    ) : low ? (
                      <span className="text-xs font-medium text-amber-700">
                        Stoc scăzut
                      </span>
                    ) : (
                      <span className="text-xs text-stone-500">OK</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      {can('inventory.adjust') ? (
                        <button
                          type="button"
                          onClick={() => setStockDialogProduct(product)}
                          disabled={product.invalidStock || !operation.online}
                          className="rounded border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                        >
                          Stoc
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setHistoryProduct(product.id)}
                        className="rounded border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Istoric
                      </button>
                      {can('transfers.execute') ? (
                        <Link
                          to={`/admin/transfers/new?productId=${product.id}&from=${selectedFair ?? 'workshop'}`}
                          className="rounded border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                        >
                          Transfer
                        </Link>
                      ) : null}
                      {can('products.posOptions') ? (
                        <button
                          type="button"
                          onClick={() => setOptionsDialogProduct(product)}
                          className="rounded border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                        >
                          Opțiuni POS
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
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


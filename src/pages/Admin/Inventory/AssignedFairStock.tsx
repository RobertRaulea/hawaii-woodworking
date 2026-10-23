import { useMemo, useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';
import {
  filterStockRows,
  formatStock,
} from '../../../utils/inventory.utils';
import type { StockAvailability } from '../../../utils/inventory.utils';
import type { InventoryProduct } from '../../../types/inventory.types';
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
    return <p className="text-sm text-stone-500">Se încarcă stocurile...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Stocuri</h1>
      <p className="mt-1 text-sm text-stone-500">
        Vezi doar stocul de la târgurile alocate. Alocările și transferurile se
        fac de către echipa de atelier.
      </p>
      {overview.fairs.length === 0 ? (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Nu ai târguri active alocate. Cere administratorului alocarea.
        </p>
      ) : null}
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
          value={selectedFair}
          onChange={(event) => setFairId(event.target.value as Id<'fairs'>)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          aria-label="Târg"
        >
          {overview.fairs.map((fair) => (
            <option key={fair._id} value={fair._id}>
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
          <option value="out">Fără stoc</option>
        </select>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-stone-600">
                Produs
              </th>
              <th className="px-3 py-2 text-left font-medium text-stone-600">
                SKU
              </th>
              <th className="px-3 py-2 text-right font-medium text-stone-600">
                Fizic
              </th>
              <th className="px-3 py-2 text-right font-medium text-stone-600">
                Disponibil
              </th>
              <th className="px-3 py-2 text-right font-medium text-stone-600">
                Acțiuni
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((product) => {
              const quantity =
                product.fairs.find((row) => row.fairId === selectedFair)
                  ?.quantity ?? 0;
              return (
                <tr key={product.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-stone-900">{product.name}</p>
                    <p className="text-xs text-stone-500">{product.category}</p>
                  </td>
                  <td className="px-3 py-2 text-stone-600">
                    {product.sku || '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatStock(product.invalidStock ? null : quantity)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatStock(product.invalidStock ? null : quantity)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setHistoryProduct(product.id)}
                      className="rounded border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Istoric
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

import { useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowsRightLeftIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { useInventoryOperation } from '../../../hooks/useInventoryOperation';
import { formatStock } from '../../../utils/inventory.utils';
import { searchText } from '../PointOfSale/pos.utils';
import { StockTransferDialog } from './StockTransferDialog';
import { ProductPosOptionsDialog } from './ProductPosOptionsDialog';
import { InventoryFeedback } from './InventoryFeedback';
import { InventoryReviewSummary } from '../Orders/InventoryReviewSummary';

interface InventoryWorkspaceProps {
  actorId: string;
}

const InventoryWorkspace = ({ actorId }: InventoryWorkspaceProps) => {
  const { data, error } = useAdminQuery(api.pos.getStockOverview, {});
  const operation = useInventoryOperation(actorId);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [transferProduct, setTransferProduct] = useState<string | null>(null);
  const [optionsProduct, setOptionsProduct] = useState<string | null>(null);
  const selectedFairId = params.get('fairId') ?? '';
  const selectedFair = data?.fairs.find((fair) => fair._id === selectedFairId);
  const visible = useMemo(() => {
    const term = searchText(search.trim());
    return (
      data?.products.filter(
        (product) =>
          !term || searchText(`${product.name} ${product.sku}`).includes(term),
      ) ?? []
    );
  }, [data, search]);
  const totals = useMemo(
    () =>
      (data?.products ?? []).reduce(
        (sum, product) => {
          if (
            product.totalStock === null ||
            product.onlineStock === null ||
            product.fairsStock === null
          )
            return { ...sum, excluded: sum.excluded + 1 };
          return {
            total: sum.total + product.totalStock,
            online: sum.online + product.onlineStock,
            held: sum.held + (product.onlineHeldOrders ?? 0),
            fairs: sum.fairs + product.fairsStock,
            excluded: sum.excluded,
          };
        },
        { total: 0, online: 0, fairs: 0, held: 0, excluded: 0 },
      ),
    [data],
  );
  const options = data?.products.find(
    (product) => product.id === optionsProduct,
  );
  const hasActiveFairs = data?.fairs.some((fair) => fair.active) ?? false;

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            O singură evidență
          </p>
          <h1 className="text-3xl font-semibold text-stone-900">Stocuri</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Totalul fizic este stocul online fizic plus cantitățile de la toate
            târgurile. Disponibilul online exclude unitățile ținute pentru
            comenzi deja plătite. Transferurile nu schimbă totalul.
          </p>
        </div>
        <Link
          to="/admin/fairs"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700"
        >
          Administrează târgurile
        </Link>
      </header>
      {!operation.online ? (
        <p
          role="status"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          Fără conexiune la server. Transferurile sunt blocate până la
          reconectare.
        </p>
      ) : null}
      <InventoryFeedback
        operation={
          transferProduct !== null
            ? { ...operation, pending: null, error: '' }
            : operation
        }
      />
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      ) : !data ? (
        <p role="status" className="py-12 text-center text-stone-500">
          Se încarcă evidența stocurilor...
        </p>
      ) : (
        <>
          <InventoryReviewSummary />
          {data.issues.length ? (
            <section
              aria-label="Probleme în evidență"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
            >
              {data.issues.map((issue) => (
                <p key={issue} role="alert">
                  {issue}
                </p>
              ))}
            </section>
          ) : null}
          <dl className="grid gap-3 md:grid-cols-3">
            {[
              ['Total înregistrat', totals.total],
              ['Disponibil online', totals.online],
              ['La toate târgurile', totals.fairs],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-stone-200 bg-white p-5"
              >
                <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {label}
                </dt>
                <dd className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-stone-900">
                  {formatStock(Number(value))}
                  <span className="ml-2 text-sm font-normal text-stone-400">
                    buc.
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          {totals.held > 0 ? (
            <p className="text-sm text-amber-900">
              {formatStock(totals.held)} buc. din stocul fizic online sunt
              ținute pentru comenzi plătite, încă nealocate. Sunt incluse în
              totalul fizic, nu în disponibil.
            </p>
          ) : null}
          {totals.excluded ? (
            <p className="text-xs text-amber-800">
              Totalurile de mai sus includ numai produsele cu evidență completă.{' '}
              {totals.excluded} produse neevidențiate sau cu date invalide sunt
              afișate separat în tabel.
            </p>
          ) : null}
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-stone-400" />
              <label htmlFor="admin-stock-search" className="sr-only">
                Caută produs sau SKU
              </label>
              <input
                id="admin-stock-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Caută produs sau SKU..."
                className="min-h-12 w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-4"
              />
            </div>
            <div className="md:w-64">
              <label htmlFor="admin-stock-fair" className="sr-only">
                Defalcare pe târg
              </label>
              <select
                id="admin-stock-fair"
                value={selectedFair?._id ?? ''}
                onChange={(event) =>
                  setParams(
                    event.target.value ? { fairId: event.target.value } : {},
                  )
                }
                className="min-h-12 w-full rounded-xl border border-stone-300 bg-white p-3 text-sm"
              >
                <option value="">Toate târgurile</option>
                {data.fairs.map((fair) => (
                  <option key={fair._id} value={fair._id}>
                    {fair.name}
                    {fair.active ? '' : ' (arhivat)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!data.products.length ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
              <p className="text-stone-600">Nu există încă produse.</p>
              <Link
                to="/admin/products/new"
                className="mt-3 inline-block text-sm font-semibold text-amber-800 underline"
              >
                Adaugă un produs
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Stoc total, online și pe târg pentru fiecare produs
                </caption>
                <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-500">
                  <tr>
                    <th className="p-4 text-left">Produs / SKU</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-right">Online disponibil</th>
                    <th className="p-4 text-right">La târguri</th>
                    {selectedFair ? (
                      <th className="p-4 text-right">{selectedFair.name}</th>
                    ) : null}
                    <th className="p-4 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-stone-100 last:border-0"
                    >
                      <td className="min-w-44 p-4">
                        <p className="font-semibold text-stone-900">
                          {product.name}
                        </p>
                        <p className="mt-1 text-xs text-stone-400">
                          {product.sku || 'Fără SKU'}
                          {product.category ? ` · ${product.category}` : ''}
                        </p>
                        {product.fairs.length ? (
                          <details className="mt-2 text-xs text-stone-500">
                            <summary className="cursor-pointer py-1">
                              Defalcare pe târguri
                            </summary>
                            <ul className="mt-1 space-y-1">
                              {product.fairs.map((fair) => (
                                <li key={fair.fairId}>
                                  {fair.name}: {formatStock(fair.quantity)} buc.
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                        {product.invalidStock ? (
                          <p className="mt-1 text-xs font-medium text-red-700">
                            Stoc invalid — necesită verificare
                          </p>
                        ) : null}
                      </td>
                      <td className="p-4 text-right font-semibold tabular-nums">
                        {formatStock(product.totalStock)}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {formatStock(product.onlineStock)}
                        {(product.onlineHeldOrders ?? 0) > 0 ? (
                          <p className="mt-1 text-xs text-amber-900">
                            Fizic: {formatStock(product.onlinePhysicalStock)} ·
                            Ținute: {formatStock(product.onlineHeldOrders)}
                          </p>
                        ) : null}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {formatStock(product.fairsStock)}
                      </td>
                      {selectedFair ? (
                        <td className="p-4 text-right font-medium tabular-nums text-amber-900">
                          {formatStock(
                            product.fairs.find(
                              (fair) => fair.fairId === selectedFair._id,
                            )?.quantity ?? 0,
                          )}
                        </td>
                      ) : null}
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            aria-label={`Transferă ${product.name}`}
                            disabled={
                              !operation.online ||
                              operation.blocked ||
                              product.invalidStock ||
                              !hasActiveFairs
                            }
                            onClick={() => setTransferProduct(product.id)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-40"
                          >
                            <ArrowsRightLeftIcon className="h-4 w-4" /> Transfer
                          </button>
                          <button
                            type="button"
                            aria-label={`Opțiuni POS ${product.name}`}
                            disabled={!operation.online || operation.blocked}
                            onClick={() => setOptionsProduct(product.id)}
                            className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-40"
                          >
                            <AdjustmentsHorizontalIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length ? (
                <p className="p-8 text-center text-stone-500">
                  Niciun produs nu corespunde căutării.
                </p>
              ) : null}
            </div>
          )}
        </>
      )}
      {transferProduct !== null && data ? (
        <StockTransferDialog
          products={data.products}
          fairs={data.fairs}
          initialProductId={transferProduct}
          initialFairId={selectedFair?._id}
          operation={operation}
          onClose={() => setTransferProduct(null)}
        />
      ) : null}
      {options ? (
        <ProductPosOptionsDialog
          product={options}
          online={operation.online}
          onClose={() => setOptionsProduct(null)}
        />
      ) : null}
    </section>
  );
};

export const AdminInventory = () => {
  const { user } = useUser();
  return user ? <InventoryWorkspace key={user.id} actorId={user.id} /> : null;
};

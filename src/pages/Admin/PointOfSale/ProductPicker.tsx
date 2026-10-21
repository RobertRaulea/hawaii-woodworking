import { useMemo, useState } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  StarIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as SolidStarIcon } from '@heroicons/react/24/solid';
import { formatMoney, searchText } from './pos.utils';
import type { CartLine, PosProduct } from './pos.types';

interface ProductPickerProps {
  products: PosProduct[];
  cart: CartLine[];
  disabled: boolean;
  onAdd: (product: PosProduct) => void;
}

export const ProductPicker = ({
  products,
  cart,
  disabled,
  onAdd,
}: ProductPickerProps) => {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [quickOnly, setQuickOnly] = useState(false);
  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))].sort(),
    [products],
  );
  const selected = useMemo(
    () => new Map(cart.map((line) => [line.product.id, line.quantity])),
    [cart],
  );
  const visible = useMemo(() => {
    const term = searchText(search.trim());
    return products.filter(
      (product) =>
        (!category || product.category === category) &&
        (!quickOnly || product.favorite) &&
        (!term || searchText(`${product.name} ${product.sku}`).includes(term)),
    );
  }, [products, category, search, quickOnly]);

  return (
    <section className="min-w-0" aria-label="Selectie produse">
      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            const match = products.find(
              (product) =>
                product.sku &&
                searchText(product.sku) === searchText(search.trim()),
            );
            if (
              match &&
              !disabled &&
              (selected.get(match.id) ?? 0) < match.stock
            ) {
              onAdd(match);
              setSearch('');
            }
          }}
        >
          <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-stone-400" />
          <label htmlFor="pos-search" className="sr-only">
            Cauta dupa nume sau SKU
          </label>
          <input
            id="pos-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cauta un produs sau scaneaza SKU..."
            className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-11 pr-4 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
          />
        </form>
        <button
          type="button"
          aria-pressed={quickOnly}
          onClick={() => setQuickOnly((value) => !value)}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold ${quickOnly ? 'border-amber-700 bg-amber-100 text-amber-900' : 'border-stone-300 bg-white text-stone-700'}`}
        >
          <StarIcon className="h-5 w-5" /> Produse rapide
        </button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
        <nav
          aria-label="Categorii produse"
          className="flex gap-2 overflow-x-auto pb-2 lg:w-36 lg:shrink-0 lg:flex-col"
        >
          {['', ...categories].map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
              className={`min-h-11 shrink-0 rounded-lg px-3 py-3 text-left text-sm font-medium ${category === name ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200'}`}
            >
              {name || 'Toate produsele'}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between text-xs text-stone-500">
            <span>{visible.length} produse</span>
            <span>Stoc exclusiv la targ</span>
          </div>
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-600">
              Niciun produs gasit. Schimba filtrele sau configureaza produsele
              favorite.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {visible.map((product) => {
                const quantity = selected.get(product.id) ?? 0;
                const unavailable = disabled || product.stock <= quantity;
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={unavailable}
                    onClick={() => onAdd(product)}
                    aria-label={`Adauga ${product.name}. ${formatMoney(product.unitPriceCents)}. Stoc ${product.stock}`}
                    className="group overflow-hidden rounded-xl border border-stone-200 bg-white text-left shadow-sm transition hover:border-amber-600 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-50 to-stone-200">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <CubeIcon className="absolute inset-0 m-auto h-12 w-12 text-stone-400" />
                      )}
                      {product.favorite ? (
                        <SolidStarIcon className="absolute left-2 top-2 h-5 w-5 text-amber-600 drop-shadow" />
                      ) : null}
                      {quantity > 0 ? (
                        <span className="absolute right-2 top-2 rounded-full bg-stone-900 px-2 py-1 text-xs font-bold text-white">
                          {quantity} in cos
                        </span>
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs text-stone-500">
                        {product.sku || product.category}
                      </p>
                      <p className="mb-3 mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-stone-900">
                        {product.name}
                      </p>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-bold text-stone-900">
                          {formatMoney(product.unitPriceCents)}
                        </span>
                        <PlusIcon className="h-7 w-7 rounded-full bg-amber-100 p-1 text-amber-800" />
                      </div>
                      <p
                        className={`mt-2 text-xs ${product.stock <= 5 ? 'text-amber-800' : 'text-stone-500'}`}
                      >
                        {product.stock > 0
                          ? `${product.stock} buc. disponibile`
                          : 'Stoc epuizat la targ'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <p className="mt-5 text-xs leading-5 text-stone-500">
        Scanerul tip tastatura poate introduce SKU in cautare; Enter adauga o
        bucata. Selectia nu rezerva si nu scade stocul.
      </p>
    </section>
  );
};

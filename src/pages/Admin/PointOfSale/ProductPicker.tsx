import { useMemo, useState } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
 (!term || searchText(`${product.name} ${product.sku}`).includes(term)),
 );
 }, [products, category, search]);

 return (
 <section className="min-w-0" aria-label="Selectie produse">
 <form
 className="relative mb-5"
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
 <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-stone-400 dark:text-stone-500 " />
 <label htmlFor="pos-search" className="sr-only">
 Cauta dupa nume sau SKU
 </label>
 <Input
 id="pos-search"
 type="search"
 value={search}
 onChange={(event) => setSearch(event.target.value)}
 placeholder="Cauta un produs sau scaneaza SKU..."
 className="h-auto w-full rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 py-3 pl-11 pr-4"
 />
 </form>

 <div className="flex flex-col gap-4 xl:flex-row xl:gap-5">
 <nav
 aria-label="Categorii produse"
 className="flex gap-2 overflow-x-auto pb-2 xl:w-36 xl:shrink-0 xl:flex-col xl:self-start xl:sticky xl:top-5 xl:max-h-[calc(100dvh-2.5rem)] xl:overflow-y-auto"
 >
 {['', ...categories].map((name) => (
 <Button
 key={name}
 type="button"
 variant="ghost"
 aria-pressed={category === name}
 onClick={() => setCategory(name)}
 className={`h-auto min-h-11 shrink-0 justify-start whitespace-normal rounded-lg px-3 py-3 text-left text-sm font-medium ${category === name ? 'bg-stone-900 text-white hover:bg-stone-900 hover:text-white' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-600 dark:hover:text-stone-300'}`}
 >
 {name || 'Toate produsele'}
 </Button>
 ))}
 </nav>
 <div className="min-w-0 flex-1">
 <div className="mb-3 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 ">
 <span>{visible.length} produse</span>
 <span>Stoc exclusiv la targ</span>
 </div>
 {visible.length === 0 ? (
 <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-700 p-8 text-center text-stone-600 dark:text-stone-300 ">
 Niciun produs gasit. Schimba categoria sau termenul cautat.
 </div>
 ) : (
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
 className="group overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-left shadow-sm transition hover:border-amber-600 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
 >
 <div className="relative aspect-[3/2] overflow-hidden bg-gradient-to-br from-amber-50 to-stone-200 dark:from-amber-950 dark:to-stone-800">
 {product.image ? (
 <img
 src={product.image}
 alt=""
 loading="lazy"
 className="h-full w-full object-cover"
 />
 ) : (
 <Package className="absolute inset-0 m-auto h-12 w-12 text-stone-400 dark:text-stone-500 " />
 )}
 {quantity > 0 ? (
 <span className="absolute right-2 top-2 rounded-full bg-stone-900 px-2 py-1 text-xs font-bold text-white">
 {quantity} in cos
 </span>
 ) : null}
 </div>
 <div className="p-2.5">
 <p className="truncate text-xs text-stone-500 dark:text-stone-400 ">
 {product.sku || product.category}
 </p>
 <p className="mb-2 mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-stone-900 dark:text-stone-50 ">
 {product.name}
 </p>
 <div className="flex items-center justify-between gap-1">
 <span className="text-sm font-bold text-stone-900 dark:text-stone-50 ">
 {formatMoney(product.unitPriceCents)}
 </span>
 <Plus className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/40 p-1 text-amber-800 dark:text-amber-300 " />
 </div>
 <p
 className={`mt-1.5 text-xs ${product.stock <= 5 ? 'text-amber-800 dark:text-amber-300 ' : 'text-stone-500 dark:text-stone-400 '}`}
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
 <p className="mt-5 text-xs leading-5 text-stone-500 dark:text-stone-400 ">
 Scanerul tip tastatura poate introduce SKU in cautare; Enter adauga o
 bucata. Selectia nu rezerva si nu scade stocul.
 </p>
 </section>
 );
};

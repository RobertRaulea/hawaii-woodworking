import { useForm } from 'react-hook-form';
import {
 Banknote,
 CreditCard,
 Minus,
 Plus,
 ShoppingBag,
 Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductThumb } from '../../../components/ProductThumb';
import { computeDiscountCents, formatMoney, parseMoney } from './pos.utils';
import type { PosDiscountMode } from './pos.utils';
import type { CartLine, PaymentMethod, PosProduct } from './pos.types';

interface DiscountFields {
 mode: PosDiscountMode;
 amount: string;
 reason: string;
}

interface OrderPanelProps {
 cart: CartLine[];
 products: PosProduct[];
 disabled: boolean;
 canPay: boolean;
 onQuantity: (id: PosProduct['id'], quantity: number) => void;
 onClear: () => void;
 onPay: (method: PaymentMethod, discountCents: number, reason: string) => void;
}

export const OrderPanel = ({
 cart,
 products,
 disabled,
 canPay,
 onQuantity,
 onClear,
 onPay,
}: OrderPanelProps) => {
 const {
 register,
 watch,
 handleSubmit,
 formState: { errors },
 trigger,
 } = useForm<DiscountFields>({
 defaultValues: { mode: 'fixed', amount: '', reason: '' },
 mode: 'onChange',
 });
 const subtotal = cart.reduce(
 (sum, line) => sum + line.quantity * line.product.unitPriceCents,
 0,
 );
 const mode = watch('mode');
 const discount = computeDiscountCents(
 mode,
 watch('amount') || '',
 subtotal,
 );
 const units = cart.reduce((sum, line) => sum + line.quantity, 0);
 const pay = (method: PaymentMethod) =>
 handleSubmit((values) =>
 onPay(
 method,
 computeDiscountCents(values.mode, values.amount, subtotal),
 values.reason,
 ),
 );

 return (
 <aside
 className="self-start overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm md:sticky md:top-5 md:flex md:max-h-[calc(100dvh-2.5rem)] md:flex-col md:overflow-y-auto"
 aria-label="Comanda curenta"
 >
 <div className="flex shrink-0 items-center justify-between border-b border-stone-200 dark:border-stone-800 px-5 py-5">
 <div>
 <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50 ">
 Comanda curenta
 </h2>
 <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 ">
 {units} bucati selectate
 </p>
 </div>
 <ShoppingBag className="h-6 w-6 text-amber-700 dark:text-amber-400 " />
 </div>
 {cart.length === 0 ? (
 <div className="px-6 py-12 text-center md:min-h-0 md:overflow-y-auto">
 <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-stone-300" />
 <p className="font-medium text-stone-700 dark:text-stone-300 ">
 O noua vanzare incepe aici
 </p>
 <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 ">
 Apasa pe produse pentru a le adauga.
 </p>
 </div>
 ) : (
 <ul className="max-h-[45vh] divide-y divide-stone-100 dark:divide-stone-800 overflow-y-auto px-5 md:min-h-0 md:max-h-none md:flex-1">
 {cart.map(({ product, quantity }) => {
 const current = products.find((entry) => entry.id === product.id);
 return (
 <li key={product.id} className="py-4">
 <div className="flex justify-between gap-3">
 <div className="flex min-w-0 items-center gap-3">
 <ProductThumb
 src={product.image}
 alt={product.name}
 className="h-12 w-12"
 />
 <div className="min-w-0">
 <p className="text-sm font-semibold text-stone-900 dark:text-stone-50 ">
 {product.name}
 </p>
 <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 ">
 {formatMoney(product.unitPriceCents)} / buc.
 </p>
 </div>
 </div>
 <Button
 type="button"
 variant="ghost"
 disabled={disabled}
 aria-label={`Elimina ${product.name}`}
 onClick={() => onQuantity(product.id, 0)}
 className="-mr-2 h-auto min-h-11 min-w-11 rounded-lg p-3 text-stone-400 dark:text-stone-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-400"
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 <div className="mt-2 flex items-center justify-between">
 <div className="flex items-center rounded-lg border border-stone-200 dark:border-stone-800 ">
 <Button
 type="button"
 variant="ghost"
 disabled={disabled}
 aria-label={`Scade cantitatea pentru ${product.name}`}
 onClick={() => onQuantity(product.id, quantity - 1)}
 className="h-auto min-h-11 min-w-11 rounded-l-lg rounded-r-none p-3 hover:bg-stone-100 dark:hover:bg-stone-800"
 >
 <Minus className="h-4 w-4" />
 </Button>
 <span className="min-w-7 text-center text-sm font-semibold">
 {quantity}
 </span>
 <Button
 type="button"
 variant="ghost"
 disabled={disabled || quantity >= (current?.stock ?? 0)}
 aria-label={`Creste cantitatea pentru ${product.name}`}
 onClick={() => onQuantity(product.id, quantity + 1)}
 className="h-auto min-h-11 min-w-11 rounded-l-none rounded-r-lg p-3 hover:bg-stone-100 dark:hover:bg-stone-800"
 >
 <Plus className="h-4 w-4" />
 </Button>
 </div>
 <span className="text-sm font-semibold">
 {formatMoney(quantity * product.unitPriceCents)}
 </span>
 </div>
 {!current ||
 quantity > current.stock ||
 current.unitPriceCents !== product.unitPriceCents ? (
 <p className="mt-2 text-xs text-red-700 dark:text-red-400 ">
 Stocul sau pretul s-a schimbat. Elimina produsul si
 selecteaza-l din nou.
 </p>
 ) : null}
 </li>
 );
 })}
 </ul>
 )}
 <div className="shrink-0 space-y-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 p-5">
 <details className="text-sm text-stone-600 dark:text-stone-300 ">
 <summary className="cursor-pointer py-1">Reducere</summary>
 <p className="mb-3 mt-2 text-xs">
 Motivul se salveaza cu vanzarea.
 </p>
 <label htmlFor="pos-discount-mode" className="text-xs">
 Tip reducere
 </label>
 <select
 id="pos-discount-mode"
 disabled={disabled}
 className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-2.5"
 {...register('mode', {
 onChange: () => void trigger('amount'),
 })}
 >
 <option value="fixed">Suma fixa (lei)</option>
 <option value="percent">Procent (%)</option>
 <option value="final">Pret convenit (total final)</option>
 </select>
 <label htmlFor="pos-discount" className="mt-3 block text-xs">
 {mode === 'percent'
 ? 'Reducere (%)'
 : mode === 'final'
 ? 'Suma convenita (lei)'
 : 'Reducere fixa (lei)'}
 </label>
 <Input
 id="pos-discount"
 inputMode="decimal"
 disabled={disabled}
 className="mt-1 h-auto w-full rounded-lg border-stone-300 dark:border-stone-700 p-2.5"
 {...register('amount', {
 validate: (value) => {
 const raw = value.trim();
 if (!raw) return true;
 if (mode === 'percent') {
 const percent = Number(raw.replace(',', '.'));
 return (
 (Number.isFinite(percent) &&
 percent > 0 &&
 percent <= 100) ||
 'Introdu un procent intre 0 si 100.'
 );
 }
 const cents = parseMoney(raw);
 return (
 (cents !== null && cents <= subtotal) ||
 (mode === 'final'
 ? 'Suma convenita nu poate depasi subtotalul.'
 : 'Introdu o reducere valida, cel mult egala cu subtotalul.')
 );
 },
 })}
 />
 {errors.amount ? (
 <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400 ">
 {errors.amount.message}
 </p>
 ) : null}
 <label htmlFor="pos-discount-reason" className="mt-3 block text-xs">
 Motivul reducerii
 </label>
 <Input
 id="pos-discount-reason"
 disabled={disabled}
 className="mt-1 h-auto w-full rounded-lg border-stone-300 dark:border-stone-700 p-2.5"
 {...register('reason', {
 maxLength: { value: 500, message: 'Maximum 500 de caractere.' },
 validate: (value) =>
 discount === 0 ||
 Boolean(value.trim()) ||
 'Motivul este obligatoriu.',
 })}
 />
 {errors.reason ? (
 <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400 ">
 {errors.reason.message}
 </p>
 ) : null}
 </details>
 {discount > 0 ? (
 <div className="flex justify-between text-sm text-stone-600 dark:text-stone-300 ">
 <span>Reducere</span>
 <span>-{formatMoney(discount)}</span>
 </div>
 ) : null}
 <div className="flex items-end justify-between">
 <span className="text-stone-600 dark:text-stone-300 ">Total de incasat</span>
 <strong className="text-3xl tracking-tight text-stone-900 dark:text-stone-50 ">
 {formatMoney(Math.max(0, subtotal - discount))}
 </strong>
 </div>
 {errors.amount || errors.reason ? (
 <p role="alert" className="text-sm text-red-700 dark:text-red-400 ">
 Verifica valoarea si motivul reducerii.
 </p>
 ) : null}
 <Button
 type="button"
 size="2xl"
 onClick={pay('cash')}
 disabled={disabled || !canPay || cart.length === 0}
 className="w-full rounded-xl bg-amber-700 px-4 py-3 font-semibold hover:bg-amber-800 disabled:cursor-not-allowed [&_svg]:size-5"
 >
 <Banknote className="h-5 w-5" /> Incaseaza CASH
 </Button>
 <Button
 type="button"
 variant="outline"
 size="2xl"
 onClick={pay('card')}
 disabled={disabled || !canPay || cart.length === 0}
 className="w-full rounded-xl border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 font-semibold text-stone-800 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-100 disabled:cursor-not-allowed [&_svg]:size-5"
 >
 <CreditCard className="h-5 w-5" /> Plata cu cardul
 </Button>
 <Button
 type="button"
 variant="ghost"
 disabled={disabled || cart.length === 0}
 onClick={onClear}
 className="h-auto min-h-11 w-full rounded-lg text-sm text-stone-500 dark:text-stone-400hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-500 dark:hover:text-stone-400:"
 >
 Goleste cosul
 </Button>
 <p className="text-center text-[11px] leading-5 text-stone-500 dark:text-stone-400 ">
 Stocul se actualizeaza numai dupa confirmare.
 <br />
 Inregistrarea platii nu emite documente fiscale.
 </p>
 </div>
 </aside>
 );
};

import { useForm } from 'react-hook-form';
import {
  BanknotesIcon,
  CreditCardIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
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
      className="self-start overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:sticky lg:top-5"
      aria-label="Comanda curenta"
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-5">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">
            Comanda curenta
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            {units} bucati selectate
          </p>
        </div>
        <ShoppingBagIcon className="h-6 w-6 text-amber-700" />
      </div>
      {cart.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <ShoppingBagIcon className="mx-auto mb-3 h-10 w-10 text-stone-300" />
          <p className="font-medium text-stone-700">
            O noua vanzare incepe aici
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Apasa pe produse pentru a le adauga.
          </p>
        </div>
      ) : (
        <ul className="max-h-[45vh] divide-y divide-stone-100 overflow-y-auto px-5">
          {cart.map(({ product, quantity }) => {
            const current = products.find((entry) => entry.id === product.id);
            return (
              <li key={product.id} className="py-4">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {formatMoney(product.unitPriceCents)} / buc.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Elimina ${product.name}`}
                    onClick={() => onQuantity(product.id, 0)}
                    className="-mr-2 min-h-11 min-w-11 rounded-lg p-3 text-stone-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-stone-200">
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={`Scade cantitatea pentru ${product.name}`}
                      onClick={() => onQuantity(product.id, quantity - 1)}
                      className="min-h-11 min-w-11 rounded-l-lg p-3 hover:bg-stone-100 disabled:opacity-40"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="min-w-7 text-center text-sm font-semibold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={disabled || quantity >= (current?.stock ?? 0)}
                      aria-label={`Creste cantitatea pentru ${product.name}`}
                      onClick={() => onQuantity(product.id, quantity + 1)}
                      className="min-h-11 min-w-11 rounded-r-lg p-3 hover:bg-stone-100 disabled:opacity-40"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatMoney(quantity * product.unitPriceCents)}
                  </span>
                </div>
                {!current ||
                quantity > current.stock ||
                current.unitPriceCents !== product.unitPriceCents ? (
                  <p className="mt-2 text-xs text-red-700">
                    Stocul sau pretul s-a schimbat. Elimina produsul si
                    selecteaza-l din nou.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <div className="space-y-4 border-t border-stone-200 bg-stone-50/70 p-5">
        <details className="text-sm text-stone-600">
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
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5"
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
          <input
            id="pos-discount"
            inputMode="decimal"
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-stone-300 p-2.5"
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
            <p role="alert" className="mt-1 text-xs text-red-700">
              {errors.amount.message}
            </p>
          ) : null}
          <label htmlFor="pos-discount-reason" className="mt-3 block text-xs">
            Motivul reducerii
          </label>
          <input
            id="pos-discount-reason"
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-stone-300 p-2.5"
            {...register('reason', {
              maxLength: { value: 500, message: 'Maximum 500 de caractere.' },
              validate: (value) =>
                discount === 0 ||
                Boolean(value.trim()) ||
                'Motivul este obligatoriu.',
            })}
          />
          {errors.reason ? (
            <p role="alert" className="mt-1 text-xs text-red-700">
              {errors.reason.message}
            </p>
          ) : null}
        </details>
        {discount > 0 ? (
          <div className="flex justify-between text-sm text-stone-600">
            <span>Reducere</span>
            <span>-{formatMoney(discount)}</span>
          </div>
        ) : null}
        <div className="flex items-end justify-between">
          <span className="text-stone-600">Total de incasat</span>
          <strong className="text-3xl tracking-tight text-stone-900">
            {formatMoney(Math.max(0, subtotal - discount))}
          </strong>
        </div>
        {errors.amount || errors.reason ? (
          <p role="alert" className="text-sm text-red-700">
            Verifica valoarea si motivul reducerii.
          </p>
        ) : null}
        <button
          type="button"
          onClick={pay('cash')}
          disabled={disabled || !canPay || cart.length === 0}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <BanknotesIcon className="h-5 w-5" /> Incaseaza CASH
        </button>
        <button
          type="button"
          onClick={pay('card')}
          disabled={disabled || !canPay || cart.length === 0}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 font-semibold text-stone-800 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CreditCardIcon className="h-5 w-5" /> Plata cu cardul
        </button>
        <button
          type="button"
          disabled={disabled || cart.length === 0}
          onClick={onClear}
          className="min-h-11 w-full rounded-lg text-sm text-stone-500 hover:bg-stone-200 disabled:opacity-40"
        >
          Goleste cosul
        </button>
        <p className="text-center text-[11px] leading-5 text-stone-500">
          Stocul se actualizeaza numai dupa confirmare.
          <br />
          Inregistrarea platii nu emite documente fiscale.
        </p>
      </div>
    </aside>
  );
};

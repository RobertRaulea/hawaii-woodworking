import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  MapPinIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { businessDate } from '../../../../convex/lib/pos.utils';
import { OrderPanel } from './OrderPanel';
import { PaymentDialog } from './PaymentDialog';
import { ProductPicker } from './ProductPicker';
import { formatMoney } from './pos.utils';
import { usePosPayment } from './usePosPayment';
import type { CartLine, PaymentMethod, PosProduct } from './pos.types';

interface SellerWorkspaceProps {
  sellerId: string;
}

const SellerWorkspace = ({ sellerId }: SellerWorkspaceProps) => {
  const fairs = useQuery(api.pos.listFairs, {});
  const [selectedFair, setSelectedFair] = useState<Id<'fairs'> | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderVersion, setOrderVersion] = useState(0);
  const [now, setNow] = useState(Date.now);
  const clearCart = useCallback(() => {
    setCart([]);
    setOrderVersion((value) => value + 1);
  }, []);
  const payment = usePosPayment(sellerId, clearCart);
  const selectedActive = fairs?.some((entry) => entry._id === selectedFair);
  const fairId =
    payment.pending?.args.fairId ??
    (selectedFair && (cart.length > 0 || selectedActive)
      ? selectedFair
      : fairs?.[0]?._id);
  const fair = fairs?.find((entry) => entry._id === fairId);
  const fairUnavailable = fairs !== undefined && fairId !== undefined && !fair;
  const products = useQuery(
    api.pos.workspace,
    fairId && !fairUnavailable ? { fairId } : 'skip',
  );
  const date = useMemo(() => businessDate(now), [now]);
  const summary = useQuery(
    api.pos.dailySummary,
    fairId ? { fairId, date } : 'skip',
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const addProduct = (product: PosProduct) => {
    if (payment.blocked || fairUnavailable || !fairId) return;
    setSelectedFair(fairId);
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if ((existing?.quantity ?? 0) >= product.stock) return current;
      return existing
        ? current.map((line) =>
            line.product.id === product.id
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          )
        : [...current, { product, quantity: 1 }];
    });
  };

  const changeQuantity = (id: PosProduct['id'], quantity: number) => {
    if (payment.blocked) return;
    if (quantity <= 0)
      setCart((current) => current.filter((line) => line.product.id !== id));
    else {
      const available =
        products?.find((product) => product.id === id)?.stock ?? 0;
      setCart((current) =>
        current.map((line) =>
          line.product.id === id &&
          (quantity < line.quantity || quantity <= available)
            ? { ...line, quantity }
            : line,
        ),
      );
    }
  };

  const pay = (
    method: PaymentMethod,
    discountCents: number,
    discountReason: string,
  ) => {
    if (!fairId || !fair || fairUnavailable || !cart.length) return;
    void payment.start({
      fairId,
      paymentMethod: method,
      discountCents,
      discountReason,
      items: cart.map((line) => ({
        productId: line.product.id,
        quantity: line.quantity,
        expectedUnitPriceCents: line.product.unitPriceCents,
      })),
    });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_#fef3c7_0%,_#f5f5f4_45%,_#e7e5e4_100%)] text-stone-900">
      <header className="border-b border-stone-200 bg-white/90 px-4 py-4 md:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              aria-label="Inapoi la administrare"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 hover:bg-stone-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-800">
                Hawaii Woodworking
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Vanzari la targ</h1>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 md:flex-none">
              <MapPinIcon className="h-5 w-5 shrink-0 text-amber-700" />
              <label htmlFor="pos-selected-fair" className="sr-only">
                Targul selectat
              </label>
              <select
                id="pos-selected-fair"
                value={fairId ?? ''}
                disabled={
                  payment.blocked || cart.length > 0 || fairs === undefined
                }
                onChange={(event) => {
                  setSelectedFair(event.target.value as Id<'fairs'>);
                }}
                className="min-h-11 w-full max-w-64 truncate bg-transparent pr-3 text-sm font-medium outline-none disabled:opacity-60"
              >
                {!fairs?.length ? (
                  <option value="">Niciun targ configurat</option>
                ) : null}
                {fairUnavailable ? (
                  <option value={fairId}>Târg arhivat</option>
                ) : null}
                {fairs?.map((entry) => (
                  <option value={entry._id} key={entry._id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
          <p>Selecteaza → verifica → incaseaza → confirma</p>
          <p
            className={`flex items-center gap-1.5 ${payment.online ? 'text-emerald-800' : 'font-semibold text-red-700'}`}
            role="status"
          >
            <SignalIcon className="h-4 w-4" />
            {payment.online
              ? 'Conectat la server'
              : 'Fara conexiune · finalizarea blocata'}
          </p>
        </div>
        {fairUnavailable && !payment.pending ? (
          <section
            role="alert"
            className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <p>
              Târgul selectat a fost arhivat. Plata este blocată; selecția nu
              este mutată la alt târg.
            </p>
            <button
              type="button"
              onClick={clearCart}
              className="mt-2 min-h-11 rounded-lg border border-amber-800 px-3 font-semibold"
            >
              Renunță la selecția veche
            </button>
          </section>
        ) : null}
        {payment.completed ? (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
          >
            <CheckCircleIcon className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-semibold">
                Vanzare inregistrata:{' '}
                {formatMoney(payment.completed.totalCents)}
              </p>
              {payment.completed.changeCents > 0 ? (
                <p className="mt-1 text-sm">
                  Rest de oferit: {formatMoney(payment.completed.changeCents)}
                </p>
              ) : null}
              <p className="mt-1 text-xs">
                Stoc actualizat. Poti incepe urmatoarea comanda.
              </p>
            </div>
          </div>
        ) : null}
        {payment.error && !payment.pending ? (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {payment.error}
          </p>
        ) : null}
        {!payment.pending && Boolean(payment.outstanding?.length) ? (
          <section
            aria-label="Operatiuni de recuperat"
            className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-5"
          >
            <h2 className="font-semibold text-amber-950">
              Exista o operatiune anterioara de verificat
            </h2>
            <p className="mb-3 mt-2 text-sm text-amber-900">
              Verifica daca plata a fost deja efectuata. Nu solicita clientului
              o noua plata inainte de reconciliere.
            </p>
            {payment.outstanding?.map((attempt) => (
              <button
                key={attempt._id}
                type="button"
                onClick={() => payment.restore(attempt)}
                className="mt-2 block min-h-11 rounded-lg bg-amber-900 px-4 py-3 text-left text-sm text-white"
              >
                Recupereaza {formatMoney(attempt.totalCents)} ·{' '}
                {attempt.paymentMethod === 'cash' ? 'Numerar' : 'Card'} ·{' '}
                {attempt.requestId.slice(-8)}
              </button>
            ))}
          </section>
        ) : null}
        {fairs === undefined ? (
          <p role="status" className="py-20 text-center text-stone-500">
            Se incarca punctele de vanzare...
          </p>
        ) : !fairId ? (
          <section className="mx-auto max-w-lg rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold">Nu există târguri active</h2>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Crearea și pregătirea târgurilor se fac în Admin. Aici rămâne doar
              ecranul de vânzare.
            </p>
            <Link
              to="/admin/fairs"
              className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white"
            >
              Administrează târgurile
            </Link>
          </section>
        ) : (
          <>
            {products === undefined && !fairUnavailable ? (
              <p role="status" className="py-20 text-center text-stone-500">
                Se incarca produsele si stocul targului...
              </p>
            ) : (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
                <ProductPicker
                  products={products ?? []}
                  cart={cart}
                  disabled={payment.blocked || fairUnavailable}
                  onAdd={addProduct}
                />
                <OrderPanel
                  key={orderVersion}
                  cart={cart}
                  products={products ?? []}
                  disabled={payment.blocked || payment.busy}
                  canPay={payment.online && !fairUnavailable}
                  onQuantity={changeQuantity}
                  onClear={clearCart}
                  onPay={pay}
                />
              </div>
            )}
            <footer
              className="mt-7 rounded-2xl border border-stone-200 bg-white/85 px-5 py-4"
              aria-label="Vanzarile finalizate astazi"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Astazi la {fair?.name ?? 'targul selectat'}
                </p>
                <span className="text-xs text-stone-500">
                  {date} · ora Romaniei · {summary?.count ?? '—'} vanzari
                  finalizate
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-5 md:grid-cols-4">
                {[
                  [
                    'Total vanzari',
                    summary ? formatMoney(summary.totalCents) : '—',
                  ],
                  ['Bucati vandute', summary?.units ?? '—'],
                  ['Numerar', summary ? formatMoney(summary.cashCents) : '—'],
                  ['Card', summary ? formatMoney(summary.cardCents) : '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-stone-500">{label}</dt>
                    <dd className="mt-1 text-xl font-semibold tracking-tight text-stone-900">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </footer>
          </>
        )}
      </div>
      {payment.pending ? (
        <PaymentDialog key={payment.pending.args.requestId} payment={payment} />
      ) : null}
    </main>
  );
};

export const PointOfSale = () => {
  const { user } = useUser();
  return user ? <SellerWorkspace key={user.id} sellerId={user.id} /> : null;
};

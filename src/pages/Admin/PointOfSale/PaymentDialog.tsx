import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  BanknotesIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { formatMoney, parseMoney } from './pos.utils';
import type { usePosPayment } from './usePosPayment';

interface PaymentDialogProps {
  payment: ReturnType<typeof usePosPayment>;
}

interface CashFields {
  received: string;
}

export const PaymentDialog = ({ payment }: PaymentDialogProps) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<CashFields>();
  const { pending, attempt, busy, online, error, confirm, verify, abandon } =
    payment;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  if (!pending) return null;
  const isCash = pending.args.paymentMethod === 'cash';
  const paid = pending.phase === 'paid';
  const total =
    attempt?.totalCents ??
    pending.args.items.reduce(
      (sum, item) => sum + item.quantity * item.expectedUnitPriceCents,
      0,
    ) - pending.args.discountCents;
  const received = parseMoney(watch('received') || '');
  const ready = attempt?.status === 'prepared';
  const Icon = paid
    ? ExclamationTriangleIcon
    : isCash
      ? BanknotesIcon
      : CreditCardIcon;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="pos-payment-title"
      aria-describedby="pos-payment-description"
      onCancel={(event) => event.preventDefault()}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/60"
    >
      <div className="p-6 md:p-8">
        <Icon
          className={`mb-4 h-9 w-9 ${paid ? 'text-amber-700' : 'text-stone-700'}`}
        />
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
          {paid ? 'Nu incasa din nou' : 'Confirmare manuala'}
        </p>
        <h2 id="pos-payment-title" className="text-2xl font-semibold">
          {paid
            ? 'Plata de verificat'
            : isCash
              ? 'Plata in numerar'
              : 'Plata cu cardul'}
        </h2>
        <p
          id="pos-payment-description"
          className="mb-6 mt-3 text-sm leading-6 text-stone-600"
        >
          {paid
            ? 'Plata a fost confirmata de vanzator. Verifica salvarea aceleiasi operatiuni, fara a solicita clientului o noua plata. Cosul ramane blocat pana la confirmarea vanzarii.'
            : isCash
              ? 'Confirma numai dupa ce ai primit banii. Suma primita este optionala; completeaz-o doar daca vrei calculul restului.'
              : 'Aplicatia nu debiteaza cardul. Introdu suma pe terminalul bancar separat. Confirma aici numai dupa aprobarea terminalului.'}
        </p>
        {payment.recovered && !paid ? (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
          >
            Operatiune recuperata dupa redeschiderea paginii. Verifica daca
            numerarul a fost deja primit sau terminalul a aprobat deja plata. Nu
            solicita automat o noua plata.
          </p>
        ) : null}
        <div className="mb-5 flex items-center justify-between rounded-xl bg-stone-100 p-4">
          <span>De incasat</span>
          <strong className="text-2xl">{formatMoney(total)}</strong>
        </div>
        {attempt ? (
          <ul className="mb-5 space-y-2 text-sm text-stone-600">
            {attempt.items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-4">
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span className="shrink-0">
                  {formatMoney(item.quantity * item.unitPriceCents)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {!online ? (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            Fara conexiune. Finalizarea este blocata. Daca ai primit deja plata,
            confirma acest lucru pentru a o pastra local, apoi verifica dupa
            reconectare.
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
          >
            {error}
          </p>
        ) : null}
        {paid ? (
          <button
            type="button"
            onClick={verify}
            disabled={busy || !online}
            className="min-h-12 w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {busy
              ? 'Se verifica salvarea...'
              : 'Verifica / reia aceeasi salvare'}
          </button>
        ) : ready ? (
          <form
            onSubmit={handleSubmit((values) =>
              confirm(
                isCash ? (parseMoney(values.received) ?? undefined) : undefined,
              ),
            )}
          >
            {isCash ? (
              <div className="mb-5">
                <label
                  htmlFor="pos-cash-received"
                  className="mb-2 block text-sm font-medium"
                >
                  Suma primita (lei) — optional
                </label>
                <input
                  id="pos-cash-received"
                  inputMode="decimal"
                  disabled={busy}
                  placeholder="Gol = suma exacta"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-xl outline-none focus:ring-2 focus:ring-amber-600"
                  {...register('received', {
                    validate: (value) => {
                      if (!value.trim()) return true;
                      const cents = parseMoney(value);
                      return (
                        (cents !== null && cents >= total) ||
                        'Suma primita trebuie sa acopere totalul.'
                      );
                    },
                  })}
                />
                {errors.received ? (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {errors.received.message}
                  </p>
                ) : null}
                <div
                  className="mt-3 flex justify-between text-emerald-800"
                  aria-live="polite"
                >
                  <span>Rest de oferit</span>
                  <strong>
                    {received !== null && received >= total
                      ? formatMoney(received - total)
                      : '—'}
                  </strong>
                </div>
              </div>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="min-h-14 w-full rounded-xl bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-800 disabled:opacity-40"
            >
              {busy
                ? 'Se salveaza...'
                : isCash
                  ? 'Am primit banii · Confirma plata'
                  : 'Terminal aprobat · Confirma plata'}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p role="status" className="text-sm text-stone-600">
              Se verifica preturile si stocul inainte de plata. Nu incasa inca.
            </p>
            <button
              type="button"
              disabled={busy || !online}
              onClick={verify}
              className="min-h-12 w-full rounded-xl bg-stone-900 px-4 py-3 text-white disabled:opacity-40"
            >
              {busy ? 'Se verifica...' : 'Reverifica operatiunea'}
            </button>
          </div>
        )}
        {!paid ? (
          <button
            type="button"
            disabled={busy || !online}
            onClick={abandon}
            className="mt-3 min-h-12 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-600 disabled:opacity-40"
          >
            Plata neefectuata / refuzata · Inapoi la cos
          </button>
        ) : null}
        <p className="mt-5 break-all text-[11px] text-stone-500">
          Referinta: {pending.args.requestId}
        </p>
        <p className="mt-2 text-xs leading-5 text-stone-500">
          Documentele fiscale se emit separat. Retururile nu sterg vanzarea
          initiala.
        </p>
      </div>
    </dialog>
  );
};

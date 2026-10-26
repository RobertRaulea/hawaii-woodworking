import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, Banknote, CreditCard } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductThumb } from '../../../components/ProductThumb';
import { useProductThumbnails } from '../../../hooks/useProductThumbnails';
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
 const thumbnails = useProductThumbnails();
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
 ? AlertTriangle
 : isCash
 ? Banknote
 : CreditCard;

 return (
 <dialog
 ref={dialog}
 aria-labelledby="pos-payment-title"
 aria-describedby="pos-payment-description"
 onCancel={(event) => event.preventDefault()}
 className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 p-0 text-stone-900 dark:text-stone-50 shadow-2xl backdrop:bg-stone-950/60"
 >
 <div className="p-6 md:p-8">
 <Icon
 className={`mb-4 h-9 w-9 ${paid ? 'text-amber-700 dark:text-amber-400 ' : 'text-stone-700 dark:text-stone-300 '}`}
 />
 <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300 ">
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
 className="mb-6 mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300 "
 >
 {paid
 ? 'Plata a fost confirmata de vanzator. Verifica salvarea aceleiasi operatiuni, fara a solicita clientului o noua plata. Cosul ramane blocat pana la confirmarea vanzarii.'
 : isCash
 ? 'Confirma numai dupa ce ai primit banii. Suma primita este optionala; completeaz-o doar daca vrei calculul restului.'
 : 'Aplicatia nu debiteaza cardul. Introdu suma pe terminalul bancar separat. Confirma aici numai dupa aprobarea terminalului.'}
 </p>
 {payment.recovered && !paid ? (
 <Alert
 variant="warning"
 className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/60 p-3 text-sm text-amber-900 dark:text-amber-300 "
 >
 Operatiune recuperata dupa redeschiderea paginii. Verifica daca
 numerarul a fost deja primit sau terminalul a aprobat deja plata. Nu
 solicita automat o noua plata.
 </Alert>
 ) : null}
 <div className="mb-5 flex items-center justify-between rounded-xl bg-stone-100 dark:bg-stone-800 p-4">
 <span>De incasat</span>
 <strong className="text-2xl">{formatMoney(total)}</strong>
 </div>
 {attempt ? (
 <ul className="mb-5 space-y-2 text-sm text-stone-600 dark:text-stone-300 ">
 {attempt.items.map((item) => (
 <li key={item.productId} className="flex justify-between gap-4">
 <span className="flex min-w-0 items-center gap-2.5">
 <ProductThumb
 src={thumbnails.get(item.productId)}
 alt={item.name}
 className="h-8 w-8"
 />
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
 <Alert
 variant="destructive"
 className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-800 dark:text-red-300 "
 >
 Fara conexiune. Finalizarea este blocata. Daca ai primit deja plata,
 confirma acest lucru pentru a o pastra local, apoi verifica dupa
 reconectare.
 </Alert>
 ) : null}
 {error ? (
 <Alert
 variant="warning"
 className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/60 p-3 text-sm text-amber-900 dark:text-amber-300 "
 >
 {error}
 </Alert>
 ) : null}
 {paid ? (
 <Button
 type="button"
 variant="secondary"
 size="xl"
 onClick={verify}
 disabled={busy || !online}
 className="w-full rounded-xl px-4 py-3 font-semibold"
 >
 {busy
 ? 'Se verifica salvarea...'
 : 'Verifica / reia aceeasi salvare'}
 </Button>
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
 <Label
 htmlFor="pos-cash-received"
 className="mb-2 block text-sm font-medium"
 >
 Suma primita (lei) — optional
 </Label>
 <Input
 id="pos-cash-received"
 inputMode="decimal"
 disabled={busy}
 placeholder="Gol = suma exacta"
 className="h-auto w-full rounded-xl border-stone-300 dark:border-stone-700 px-4 py-3 text-xl"
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
 <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400 ">
 {errors.received.message}
 </p>
 ) : null}
 <div
 className="mt-3 flex justify-between text-emerald-800 dark:text-emerald-300 "
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
 <Button
 type="submit"
 size="2xl"
 disabled={busy}
 className="w-full rounded-xl bg-amber-700 px-4 py-3 font-semibold hover:bg-amber-800"
 >
 {busy
 ? 'Se salveaza...'
 : isCash
 ? 'Am primit banii · Confirma plata'
 : 'Terminal aprobat · Confirma plata'}
 </Button>
 </form>
 ) : (
 <div className="space-y-3">
 <p role="status" className="text-sm text-stone-600 dark:text-stone-300 ">
 Se verifica preturile si stocul inainte de plata. Nu incasa inca.
 </p>
 <Button
 type="button"
 variant="secondary"
 size="xl"
 disabled={busy || !online}
 onClick={verify}
 className="w-full rounded-xl px-4 py-3"
 >
 {busy ? 'Se verifica...' : 'Reverifica operatiunea'}
 </Button>
 </div>
 )}
 {!paid ? (
 <Button
 type="button"
 variant="outline"
 size="xl"
 disabled={busy || !online}
 onClick={abandon}
 className="mt-3 w-full rounded-xl border-stone-300 dark:border-stone-700 px-4 py-3 text-sm font-normal text-stone-600 dark:text-stone-300hover:text-stone-600 dark:hover:text-stone-300:"
 >
 Plata neefectuata / refuzata · Inapoi la cos
 </Button>
 ) : null}
 <p className="mt-5 break-all text-[11px] text-stone-500 dark:text-stone-400 ">
 Referinta: {pending.args.requestId}
 </p>
 <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-stone-400 ">
 Documentele fiscale se emit separat. Retururile nu sterg vanzarea
 initiala.
 </p>
 </div>
 </dialog>
 );
};

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, Banknote, CreditCard, Split } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field';
import { ProductThumb } from '../../../components/ProductThumb';
import { useProductThumbnails } from '../../../hooks/useProductThumbnails';
import { formatMoney, parseMoney } from './pos.utils';
import type { usePosPayment } from './usePosPayment';

interface PaymentDialogProps {
 payment: ReturnType<typeof usePosPayment>;
}

interface PaymentFields {
 received: string;
 cash: string;
 card: string;
}

export const PaymentDialog = ({ payment }: PaymentDialogProps) => {
 const dialog = useRef<HTMLDialogElement>(null);
 const {
 register,
 watch,
 handleSubmit,
 setValue,
 getValues,
 formState: { errors },
 } = useForm<PaymentFields>();
 const { pending, attempt, busy, online, error, confirm, verify, abandon } =
 payment;
 const thumbnails = useProductThumbnails();
 useEffect(() => {
 const element = dialog.current;
 if (!element) return;
 // Chromium may close the modal on a second Esc even when `cancel` was
 // prevented; reopen so the pending payment never becomes unreachable.
 const reopen = () => {
 if (!element.open) element.showModal();
 };
 element.addEventListener('close', reopen);
 element.showModal();
 return () => {
 element.removeEventListener('close', reopen);
 element.close();
 };
 }, []);
 if (!pending) return null;
 const isCash = pending.args.paymentMethod === 'cash';
 const isSplit = pending.args.paymentMethod === 'split';
 const paid = pending.phase === 'paid';
 const total =
 attempt?.totalCents ??
 pending.args.items.reduce(
 (sum, item) => sum + item.quantity * item.expectedUnitPriceCents,
 0,
 ) - pending.args.discountCents;
 const received = parseMoney(watch('received') || '');
 const splitCash = parseMoney(watch('cash') || '');
 const splitCard = parseMoney(watch('card') || '');
 const ready = attempt?.status === 'prepared';
 const Icon = paid
 ? AlertTriangle
 : isCash
 ? Banknote
 : isSplit
 ? Split
 : CreditCard;

 const syncSplit = (source: 'cash' | 'card', raw: string) => {
 const cents = parseMoney(raw);
 const target = source === 'cash' ? 'card' : 'cash';
 if (cents === null) {
 setValue(target, '');
 return;
 }
 setValue(target, ((total - cents) / 100).toFixed(2));
 };

 return (
 <dialog
 ref={dialog}
 aria-labelledby="pos-payment-title"
 aria-describedby="pos-payment-description"
 onCancel={(event) => event.preventDefault()}
 className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-card p-0 text-foreground shadow-2xl backdrop:bg-stone-950/60"
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
 : isSplit
 ? 'Plata mixta (cash + card)'
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
 : isSplit
 ? 'Incasaza partea cash de la client si introdu partea de card pe terminalul bancar separat. Confirma numai dupa ce ambele plati sunt finalizate. Plata mixta nu are rest.'
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
 <div className="mb-5 flex items-center justify-between rounded-xl bg-muted p-4">
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
 className="size-8"
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
 isSplit
 ? confirm(undefined, parseMoney(values.cash) ?? undefined)
 : confirm(
 isCash
 ? (parseMoney(values.received) ?? undefined)
 : undefined,
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
 <FieldError  className="mt-2 text-red-700 dark:text-red-400">
 {errors.received.message}
 </FieldError>
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
 {isSplit ? (
 <div className="mb-5">
 <Label
 htmlFor="pos-split-cash"
 className="mb-2 block text-sm font-medium"
 >
 Cash primit (lei)
 </Label>
 <Input
 id="pos-split-cash"
 inputMode="decimal"
 disabled={busy}
 placeholder="0,00"
 className="h-auto w-full rounded-xl border-stone-300 dark:border-stone-700 px-4 py-3 text-xl"
 {...register('cash', {
 onChange: (event) => syncSplit('cash', event.target.value),
 validate: (value) => {
 const cents = parseMoney(value);
 return (
 (cents !== null && cents > 0 && cents < total) ||
 'Suma cash trebuie sa fie mai mare decat 0 si mai mica decat totalul.'
 );
 },
 })}
 />
 {errors.cash ? (
 <FieldError  className="mt-2 text-red-700 dark:text-red-400">
 {errors.cash.message}
 </FieldError>
 ) : null}
 <Label
 htmlFor="pos-split-card"
 className="mb-2 mt-4 block text-sm font-medium"
 >
 Card (lei)
 </Label>
 <Input
 id="pos-split-card"
 inputMode="decimal"
 disabled={busy}
 placeholder="0,00"
 className="h-auto w-full rounded-xl border-stone-300 dark:border-stone-700 px-4 py-3 text-xl"
 {...register('card', {
 onChange: (event) => syncSplit('card', event.target.value),
 validate: (value) => {
 const cents = parseMoney(value);
 const cashCents = parseMoney(getValues('cash') || '');
 return (
 (cents !== null &&
 cents > 0 &&
 cashCents !== null &&
 cashCents + cents === total) ||
 'Ambele parti trebuie sa fie mai mari decat 0 si sa totalizeze suma de incasat.'
 );
 },
 })}
 />
 {errors.card ? (
 <FieldError  className="mt-2 text-red-700 dark:text-red-400">
 {errors.card.message}
 </FieldError>
 ) : null}
 <p
 className="mt-3 text-sm text-emerald-800 dark:text-emerald-300 "
 aria-live="polite"
 >
 Cash {splitCash !== null ? formatMoney(splitCash) : '—'} · Card{' '}
 {splitCard !== null ? formatMoney(splitCard) : '—'}
 </p>
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
 : isSplit
 ? 'Cash primit + terminal aprobat · Confirma plata'
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
 className="mt-3 w-full rounded-xl border-stone-300 dark:border-stone-700 px-4 py-3 text-sm font-normal text-stone-600 dark:text-stone-300 hover:text-stone-600 dark:hover:text-stone-300"
 >
 Plata neefectuata / refuzata · Inapoi la cos
 </Button>
 ) : null}
 <p className="mt-5 break-all text-[11px] text-muted-foreground">
 Referinta: {pending.args.requestId}
 </p>
 <p className="mt-2 text-xs leading-5 text-muted-foreground">
 Documentele fiscale se emit separat. Retururile nu sterg vanzarea
 initiala.
 </p>
 </div>
 </dialog>
 );
};

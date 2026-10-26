import { useCallback, useEffect, useRef, useState } from 'react';
import { useConvexConnectionState, useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '../../../../convex/_generated/api';
import { errorMessage, readCheckpoint, withTimeout } from './pos.utils';
import type {
 CompletedSale,
 PaymentCheckpoint,
 PosAttempt,
 PrepareArgs,
} from './pos.types';

export const usePosPayment = (sellerId: string, onCompleted: () => void) => {
 const storageKey = `hawaii:pos:payment:v1:${sellerId}`;
 const [initial] = useState(() => readCheckpoint(storageKey));
 const [pending, setPending] = useState(initial.pending);
 const [error, setError] = useState(initial.error);
 const [busy, setBusy] = useState(false);
 const [completed, setCompleted] = useState<CompletedSale | null>(null);
 const [recovered, setRecovered] = useState(Boolean(initial.pending));
 const current = useRef(pending);
 const working = useRef(false);
 const settled = useRef(new Set<string>());
 const { isWebSocketConnected: online } = useConvexConnectionState();
 const prepare = useMutation(api.pos.prepare);
 const complete = useMutation(api.pos.complete);
 const cancel = useMutation(api.pos.cancel);
 const lookup = useQuery(
 api.pos.lookup,
 pending ? { requestId: pending.args.requestId } : 'skip',
 );
 const outstanding = useQuery(api.pos.openAttempts);

 const persist = (next: PaymentCheckpoint | null) => {
 if (next) localStorage.setItem(storageKey, JSON.stringify(next));
 else localStorage.removeItem(storageKey);
 current.current = next;
 setPending(next);
 };

 const settle = useCallback(
 (result: CompletedSale) => {
 if (settled.current.has(result.requestId)) return;
 try {
 localStorage.removeItem(storageKey);
 } catch {
 setError(
 'Vanzarea este salvata, dar recuperarea locala nu poate fi curatata. Nu incasa din nou.',
 );
 return;
 }
 settled.current.add(result.requestId);
 current.current = null;
 setPending(null);
 setError('');
 setCompleted(result);
 onCompleted();
 },
 [storageKey, onCompleted],
 );

 useEffect(() => {
 if (lookup?.sale) {
 settle({
 requestId: lookup.sale.requestId,
 totalCents: lookup.sale.totalCents,
 changeCents: lookup.sale.changeCents,
 });
 }
 }, [lookup, settle]);

 const run = async (operation: () => Promise<void>) => {
 if (working.current) return;
 if (!online) {
 setError(
 'Fara conexiune la server. Finalizarea este blocata; nu incasa din nou.',
 );
 return;
 }
 working.current = true;
 setBusy(true);
 setError('');
 try {
 await operation();
 } catch (cause) {
 setError(errorMessage(cause));
 } finally {
 working.current = false;
 setBusy(false);
 }
 };

 const start = (args: Omit<PrepareArgs, 'requestId'>) =>
 run(async () => {
 if (
 current.current ||
 initial.error ||
 !outstanding ||
 outstanding.length
 )
 return;
 const next: PaymentCheckpoint = {
 args: { ...args, requestId: crypto.randomUUID() },
 phase: 'prepared',
 };
 try {
 persist(next);
 } catch {
 setError('Stocarea locala este blocata. Plata nu a fost pornita.');
 return;
 }
 setCompleted(null);
 setRecovered(false);
 try {
 await withTimeout(prepare(next.args));
 } catch (cause) {
 if (cause instanceof ConvexError) persist(null);
 throw cause;
 }
 });

 const confirm = (receivedCents?: number) => {
 if (working.current) return;
 const checkpoint = current.current;
 if (
 !checkpoint ||
 (checkpoint.phase !== 'paid' && lookup?.attempt?.status !== 'prepared')
 )
 return;
 const paid: PaymentCheckpoint =
 checkpoint.phase === 'paid'
 ? checkpoint
 : { ...checkpoint, phase: 'paid', receivedCents };
 try {
 persist(paid);
 } catch {
 current.current = paid;
 setPending(paid);
 setError(
 'Confirmarea nu poate fi salvata local. Nu reincasa; pastreaza pagina deschisa si verifica plata.',
 );
 return;
 }
 return run(async () => {
 const result = await withTimeout(
 complete({
 requestId: paid.args.requestId,
 receivedCents: paid.receivedCents,
 }),
 );
 settle({ ...result, requestId: paid.args.requestId });
 });
 };

 const verify = () => {
 if (current.current?.phase === 'paid') return confirm();
 return run(async () => {
 if (current.current) await withTimeout(prepare(current.current.args));
 });
 };

 const abandon = () =>
 run(async () => {
 const checkpoint = current.current;
 if (!checkpoint || checkpoint.phase === 'paid') return;
 await withTimeout(cancel({ requestId: checkpoint.args.requestId }));
 persist(null);
 });

 const restore = (attempt: PosAttempt) => {
 if (current.current || initial.error) return;
 try {
 persist({
 args: {
 requestId: attempt.requestId,
 fairId: attempt.fairId,
 paymentMethod: attempt.paymentMethod,
 discountCents: attempt.discountCents,
 discountReason: attempt.discountReason,
 items: attempt.items.map((item) => ({
 productId: item.productId,
 quantity: item.quantity,
 expectedUnitPriceCents: item.unitPriceCents,
 })),
 },
 phase: 'prepared',
 });
 setRecovered(true);
 } catch {
 setError(
 'Operatiunea nu poate fi recuperata local. Nu incasa pana la verificare.',
 );
 }
 };

 return {
 pending,
 attempt: lookup?.attempt,
 busy,
 online,
 error,
 completed,
 recovered,
 outstanding,
 blocked: Boolean(
 pending || initial.error || !outstanding || outstanding.length,
 ),
 start,
 confirm,
 verify,
 abandon,
 restore,
 };
};

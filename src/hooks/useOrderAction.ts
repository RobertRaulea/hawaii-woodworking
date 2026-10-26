import { ConvexError } from 'convex/values';
import { useConvex } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../convex/_generated/api';
import { inventoryError } from '../utils/inventory.utils';
import {
 readOrderCheckpoint,
 writeOrderCheckpoint,
} from '../utils/orderCheckpoint.utils';
import type {
 NewOrderActionRequest,
 OrderActionController,
 OrderActionRequest,
 FulfillmentEvent,
} from '../types/orders.types';

const withTimeout = <T,>(promise: Promise<T>) =>
 Promise.race([
 promise,
 new Promise<never>((_, reject) =>
 setTimeout(() => reject(new Error('Timeout')), 12000),
 ),
 ]);

const useOnline = () => {
 const [online, setOnline] = useState(() =>
 typeof navigator === 'undefined' ? true : navigator.onLine,
 );
 useEffect(() => {
 const up = () => setOnline(true);
 const down = () => setOnline(false);
 window.addEventListener('online', up);
 window.addEventListener('offline', down);
 return () => {
 window.removeEventListener('online', up);
 window.removeEventListener('offline', down);
 };
 }, []);
 return online;
};

const invoke = (
 convex: ReturnType<typeof useConvex>,
 request: OrderActionRequest,
) => {
 switch (request.kind) {
 case 'claimed':
 return convex.mutation(api.fulfillment.claim, {
 requestId: request.requestId,
 orderId: request.orderId,
 });
 case 'released':
 return convex.mutation(api.fulfillment.release, {
 requestId: request.requestId,
 orderId: request.orderId,
 });
 case 'reassigned':
 return convex.mutation(api.fulfillment.reassign, {
 requestId: request.requestId,
 orderId: request.orderId,
 userId: request.userId,
 });
 case 'checked':
 return convex.mutation(api.fulfillment.setChecked, {
 requestId: request.requestId,
 orderId: request.orderId,
 productId: request.productId,
 checked: request.checked,
 });
 case 'note':
 return convex.mutation(api.fulfillment.addNote, {
 requestId: request.requestId,
 orderId: request.orderId,
 note: request.note,
 });
 case 'packed':
 return convex.mutation(api.fulfillment.markPacked, {
 requestId: request.requestId,
 orderId: request.orderId,
 });
 case 'shipped':
 return convex.mutation(api.fulfillment.ship, {
 requestId: request.requestId,
 orderId: request.orderId,
 awb: request.awb,
 carrier: request.carrier,
 });
 case 'delivered':
 return convex.mutation(api.fulfillment.markDelivered, {
 requestId: request.requestId,
 orderId: request.orderId,
 });
 case 'cancelled':
 return convex.mutation(api.orders.cancel, {
 requestId: request.requestId,
 orderId: request.orderId,
 reason: request.reason,
 });
 }
};

export const useOrderAction = (
 actorId: string | null,
): OrderActionController => {
 const convex = useConvex();
 const online = useOnline();
 const [pending, setPending] = useState<OrderActionRequest | null>(null);
 const [busy, setBusy] = useState(false);
 const [blocked, setBlocked] = useState(false);
 const [error, setError] = useState('');
 const [completed, setCompleted] = useState<FulfillmentEvent | null>(null);
 const key = actorId ? `hawaii:orders:action:v1:${actorId}` : null;
 const resolved = useRef(false);
 const saved = useRef<OrderActionRequest | null>(null);
 const inFlight = useRef(false);

 const send = useCallback(
 async (request: OrderActionRequest) => {
 if (busy || inFlight.current) return;
 if (pending && pending.requestId !== request.requestId) return;
 inFlight.current = true;
 setBusy(true);
 setPending(request);
 setCompleted(null);
 setError('');
 if (key) writeOrderCheckpoint(key, request);
 try {
 await withTimeout(invoke(convex, request));
 const event = await convex.query(api.fulfillment.getEvent, {
 requestId: request.requestId,
 });
 if (!event)
 throw new Error('Rezultatul acțiunii nu a putut fi confirmat.');
 resolved.current = true;
 setCompleted(event);
 setPending(null);
 setBlocked(false);
 setError('');
 if (key) localStorage.removeItem(key);
 } catch (failure) {
 if (failure instanceof ConvexError) {
 setError(inventoryError(failure));
 setPending(null);
 setBlocked(false);
 if (key) localStorage.removeItem(key);
 } else {
 setBlocked(true);
 setError(
 'Rezultatul acțiunii nu este confirmat. Verifică aceeași acțiune înainte de a porni alta.',
 );
 }
 } finally {
 inFlight.current = false;
 setBusy(false);
 }
 },
 [busy, pending, convex, key],
 );

 const start = useCallback(
 async (request: NewOrderActionRequest) => {
 await send({
 ...request,
 requestId: request.requestId ?? crypto.randomUUID(),
 } as OrderActionRequest);
 },
 [send],
 );

 const retry = useCallback(async () => {
 const request = pending ?? saved.current;
 if (!request) return;
 await send(request);
 }, [pending, send]);

 useEffect(() => {
 if (!key || !actorId || resolved.current) return;
 const stored = readOrderCheckpoint(key);
 if (stored.error) {
 setError(stored.error);
 setBlocked(true);
 return;
 }
 if (!stored.pending) return;
 const request = stored.pending;
 setBlocked(true);
 saved.current = request;
 setPending(request);
 void (async () => {
 try {
 const event = await convex.query(api.fulfillment.getEvent, {
 requestId: request.requestId,
 });
 if (event) {
 resolved.current = true;
 setCompleted(event);
 setPending(null);
 localStorage.removeItem(key);
 setBlocked(false);
 setError('');
 } else {
 setError(
 'O acțiune pe comandă nu a ajuns la server. Reia exact aceeași acțiune.',
 );
 }
 } catch {
 setError('Verificarea acțiunii anterioare a eșuat. Reîncearcă.');
 }
 })();
 }, [key, actorId, convex]);

 return {
 pending,
 completed,
 busy,
 online,
 blocked,
 error,
 start,
 retry,
 dismissCompleted: useCallback(() => setCompleted(null), []),
 };
};

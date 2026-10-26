import { ConvexError } from 'convex/values';
import { useConvex } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../convex/_generated/api';
import { inventoryError } from '../utils/inventory.utils';
import {
 readTransferCheckpoint,
 writeTransferCheckpoint,
} from '../utils/transferCheckpoint.utils';
import type {
 NewTransferActionRequest,
 TransferActionController,
 TransferActionRequest,
 TransferEvent,
} from '../types/transfers.types';

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
 request: TransferActionRequest,
) => {
 switch (request.kind) {
 case 'requested':
 return convex.mutation(api.transfers.request, {
 requestId: request.requestId,
 toFairId: request.toFairId,
 lines: request.lines,
 note: request.note,
 });
 case 'created':
 return convex.mutation(api.transfers.create, {
 requestId: request.requestId,
 from: request.from,
 to: request.to,
 lines: request.lines,
 note: request.note,
 });
 case 'updated':
 return convex.mutation(api.transfers.updateDraft, {
 requestId: request.requestId,
 transferId: request.transferId,
 from: request.from,
 to: request.to,
 lines: request.lines,
 note: request.note,
 });
 case 'accepted':
 return convex.mutation(api.transfers.accept, {
 requestId: request.requestId,
 transferId: request.transferId,
 });
 case 'shipped':
 return convex.mutation(api.transfers.ship, {
 requestId: request.requestId,
 transferId: request.transferId,
 });
 case 'received':
 return convex.mutation(api.transfers.receive, {
 requestId: request.requestId,
 transferId: request.transferId,
 lines: request.lines,
 note: request.note,
 });
 case 'cancelled':
 return convex.mutation(api.transfers.cancel, {
 requestId: request.requestId,
 transferId: request.transferId,
 reason: request.reason,
 });
 }
};

export const useTransferAction = (
 actorId: string | null,
): TransferActionController => {
 const convex = useConvex();
 const online = useOnline();
 const [pending, setPending] = useState<TransferActionRequest | null>(null);
 const [busy, setBusy] = useState(false);
 const [blocked, setBlocked] = useState(false);
 const [error, setError] = useState('');
 const [completed, setCompleted] = useState<TransferEvent | null>(null);
 const key = actorId ? `hawaii:transfers:action:v1:${actorId}` : null;
 const resolved = useRef(false);
 const saved = useRef<TransferActionRequest | null>(null);
 const inFlight = useRef(false);

 const send = useCallback(
 async (request: TransferActionRequest) => {
 if (busy || inFlight.current) return;
 if (pending && pending.requestId !== request.requestId) return;
 inFlight.current = true;
 setBusy(true);
 setPending(request);
 setCompleted(null);
 setError('');
 if (key) writeTransferCheckpoint(key, request);
 try {
 await withTimeout(invoke(convex, request));
 const event = await convex.query(api.transfers.getEvent, {
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
 async (request: NewTransferActionRequest) => {
 await send({
 ...request,
 requestId: request.requestId ?? crypto.randomUUID(),
 } as TransferActionRequest);
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
 const stored = readTransferCheckpoint(key);
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
 const event = await convex.query(api.transfers.getEvent, {
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
 'O acțiune de transfer nu a ajuns la server. Reia exact aceeași acțiune.',
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

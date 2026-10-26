import { useCallback, useEffect, useRef, useState } from 'react';
import { useConvexConnectionState, useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '../../convex/_generated/api';
import { useAdminQuery } from './useAdminQuery';
import {
 inventoryError,
 readInventoryCheckpoint,
} from '../utils/inventory.utils';
import { withTimeout } from '../pages/Admin/PointOfSale/pos.utils';
import type {
 InventoryController,
 InventoryReceipt,
 InventoryRequest,
 NewInventoryRequest,
} from '../types/inventory.types';

export const useInventoryOperation = (actorId: string): InventoryController => {
 const storageKey = `hawaii:inventory:operation:v1:${actorId}`;
 const [initial] = useState(() => readInventoryCheckpoint(storageKey));
 const [pending, setPending] = useState(initial.pending);
 const [completed, setCompleted] = useState<InventoryReceipt | null>(null);
 const [error, setError] = useState(initial.error);
 const [storageFailed, setStorageFailed] = useState(Boolean(initial.error));
 const [busy, setBusy] = useState(false);
 const current = useRef(pending);
 const working = useRef(false);
 const settled = useRef(new Set<string>());
 const { isWebSocketConnected: online } = useConvexConnectionState();
 const transfer = useMutation(api.pos.transfer);
 const archive = useMutation(api.pos.archiveFair);
 const lookup = useAdminQuery(
 api.pos.getInventoryOperation,
 pending ? { requestId: pending.requestId } : 'skip',
 );

 const settle = useCallback(
 (receipt: InventoryReceipt) => {
 if (
 settled.current.has(receipt.requestId) ||
 current.current?.requestId !== receipt.requestId
 )
 return;
 try {
 const saved = readInventoryCheckpoint(storageKey);
 if (saved.error) throw new Error('Storage unavailable');
 if (saved.pending?.requestId === receipt.requestId)
 localStorage.removeItem(storageKey);
 } catch {
 setError(
 'Operațiune salvată, dar confirmarea locală nu poate fi curățată. Verifică referința; nu repeta transferul cu alt identificator.',
 );
 return;
 }
 settled.current.add(receipt.requestId);
 current.current = null;
 setPending(null);
 setCompleted(receipt);
 setStorageFailed(false);
 setError('');
 },
 [storageKey],
 );

 useEffect(() => {
 if (lookup.data) settle(lookup.data);
 }, [lookup.data, settle]);

 const execute = async (request: InventoryRequest) => {
 if (working.current) return;
 if (!online) {
 setError(
 'Fără conexiune. Operațiunea rămâne de verificat; nu porni alta.',
 );
 return;
 }
 working.current = true;
 setBusy(true);
 setError('');
 try {
 const { kind, ...args } = request;
 const receipt = await withTimeout(
 kind === 'transfer'
 ? transfer(
 args as Omit<
 Extract<InventoryRequest, { kind: 'transfer' }>,
 'kind'
 >,
 )
 : archive(
 args as Omit<
 Extract<InventoryRequest, { kind: 'archive' }>,
 'kind'
 >,
 ),
 );
 settle(receipt);
 } catch (cause) {
 if (
 cause instanceof ConvexError &&
 current.current?.requestId === request.requestId
 ) {
 try {
 const saved = readInventoryCheckpoint(storageKey);
 if (saved.error) throw new Error('Storage unavailable');
 if (saved.pending?.requestId === request.requestId)
 localStorage.removeItem(storageKey);
 current.current = null;
 setPending(null);
 setStorageFailed(false);
 } catch {
 setStorageFailed(true);
 }
 }
 setError(inventoryError(cause));
 } finally {
 working.current = false;
 setBusy(false);
 }
 };

 const start = async (input: NewInventoryRequest) => {
 if (working.current || current.current || storageFailed) return;
 if (input.requestId && settled.current.has(input.requestId)) return;
 if (!online) {
 setError('Fără conexiune. Transferul nu a fost pornit.');
 return;
 }
 const saved = readInventoryCheckpoint(storageKey);
 if (saved.error) {
 setStorageFailed(true);
 setError(saved.error);
 return;
 }
 if (saved.pending) {
 current.current = saved.pending;
 setPending(saved.pending);
 setError('Există o operațiune anterioară de verificat.');
 return;
 }
 const request = {
 ...input,
 requestId: input.requestId ?? crypto.randomUUID(),
 } as InventoryRequest;
 try {
 localStorage.setItem(storageKey, JSON.stringify(request));
 } catch {
 setStorageFailed(true);
 setError('Stocarea locală este blocată. Operațiunea nu a fost trimisă.');
 return;
 }
 current.current = request;
 setPending(request);
 setCompleted(null);
 await execute(request);
 };
 const dismissCompleted = useCallback(() => setCompleted(null), []);
 return {
 pending,
 completed,
 busy,
 online,
 blocked: Boolean(pending || storageFailed),
 error: lookup.error ?? error,
 start,
 retry: async () => {
 if (current.current) await execute(current.current);
 },
 dismissCompleted,
 };
};

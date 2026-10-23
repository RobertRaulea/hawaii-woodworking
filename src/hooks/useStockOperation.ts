import { ConvexError } from 'convex/values';
import { useConvex } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../convex/_generated/api';
import { inventoryError } from '../utils/inventory.utils';
import { readStockCheckpoint, writeStockCheckpoint } from '../utils/stockCheckpoint.utils';
import type {
  NewStockOperationRequest,
  StockOperationController,
  StockOperationRequest,
} from '../types/inventory.types';

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
  request: StockOperationRequest,
) => {
  if (request.kind === 'receipt') {
    return convex.mutation(api.inventory.receive, {
      requestId: request.requestId,
      productId: request.productId,
      quantity: request.quantity,
      note: request.note,
    });
  }
  if (request.kind === 'adjustment') {
    return convex.mutation(api.inventory.adjust, {
      requestId: request.requestId,
      productId: request.productId,
      fairId: request.fairId,
      delta: request.delta,
      reason: request.reason,
      note: request.note,
    });
  }
  return convex.mutation(api.inventory.count, {
    requestId: request.requestId,
    productId: request.productId,
    fairId: request.fairId,
    expectedQuantity: request.expectedQuantity,
    lastMovementId: request.lastMovementId,
    countedQuantity: request.countedQuantity,
    note: request.note,
  });
};

export const useStockOperation = (
  actorId: string | null,
): StockOperationController => {
  const convex = useConvex();
  const online = useOnline();
  const [pending, setPending] = useState<StockOperationRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] =
    useState<StockOperationController['completed']>(null);
  const key = actorId ? `hawaii:inventory:stock-op:v1:${actorId}` : null;
  const resolved = useRef(false);
  const saved = useRef<StockOperationRequest | null>(null);
  const inFlight = useRef(false);

  const send = useCallback(
    async (request: StockOperationRequest) => {
      if (busy || inFlight.current) return;
      if (pending && pending.requestId !== request.requestId) return;
      inFlight.current = true;
      setBusy(true);
      setPending(request);
      setCompleted(null);
      setError('');
      if (key) writeStockCheckpoint(key, request);
      try {
        const operation = await withTimeout(invoke(convex, request));
        resolved.current = true;
        setCompleted(operation);
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
            'Rezultatul operațiunii nu este confirmat. Verifică aceeași operațiune înainte de a porni alta.',
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
    async (request: NewStockOperationRequest) => {
      await send({
        ...request,
        requestId: request.requestId ?? crypto.randomUUID(),
      } as StockOperationRequest);
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
    const stored = readStockCheckpoint(key);
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
        const operation = await convex.query(api.inventory.getStockOperation, {
          requestId: request.requestId,
        });
        if (operation) {
          resolved.current = true;
          setCompleted(operation);
          setPending(null);
          localStorage.removeItem(key);
          setBlocked(false);
          setError('');
        } else {
          setError(
            'O operațiune de stoc nu a ajuns la server. Reia exact aceeași operațiune.',
          );
        }
      } catch {
        setError('Verificarea operațiunii anterioare a eșuat. Reîncearcă.');
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

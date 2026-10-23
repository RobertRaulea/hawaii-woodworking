import type { TransferActionRequest } from '../types/transfers.types';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const lines = (
  value: unknown,
): value is { productId: string; quantity: number }[] =>
  Array.isArray(value) &&
  value.length <= 50 &&
  value.every((item) => {
    if (!record(item) || typeof item.productId !== 'string') return false;
    const quantity = item.quantity;
    return (
      typeof quantity === 'number' &&
      Number.isSafeInteger(quantity) &&
      quantity > 0
    );
  });

export const readTransferCheckpoint = (
  key: string,
): { pending: TransferActionRequest | null; error: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { pending: null, error: '' };
    const value: unknown = JSON.parse(raw);
    if (
      !record(value) ||
      typeof value.requestId !== 'string' ||
      !/^[a-zA-Z0-9-]{16,100}$/.test(value.requestId)
    )
      throw new Error('Invalid action');
    if (value.kind === 'requested' || value.kind === 'created' || value.kind === 'updated') {
      if (!lines(value.lines)) throw new Error('Invalid lines');
      if (
        value.kind === 'requested' &&
        (typeof value.toFairId !== 'string' || !value.toFairId)
      )
        throw new Error('Invalid request');
      if (
        value.kind !== 'requested' &&
        (!record(value.from) || !record(value.to))
      )
        throw new Error('Invalid endpoints');
      if (
        value.kind === 'updated' &&
        (typeof value.transferId !== 'string' || !value.transferId)
      )
        throw new Error('Invalid update');
    } else if (
      value.kind === 'shipped' ||
      value.kind === 'received' ||
      value.kind === 'cancelled'
    ) {
      if (typeof value.transferId !== 'string' || !value.transferId)
        throw new Error('Invalid transfer');
      if (value.kind === 'received' && !lines(value.lines))
        throw new Error('Invalid receive');
      if (value.kind === 'cancelled' && typeof value.reason !== 'string')
        throw new Error('Invalid cancel');
    } else throw new Error('Invalid kind');
    return { pending: value as unknown as TransferActionRequest, error: '' };
  } catch {
    return {
      pending: null,
      error:
        'Recuperarea locală a acțiunii de transfer nu este disponibilă. Verifică operațiunile anterioare și accesul la stocarea browserului.',
    };
  }
};

export const writeTransferCheckpoint = (
  key: string,
  request: TransferActionRequest,
) => {
  try {
    localStorage.setItem(key, JSON.stringify(request));
  } catch {
    // Storage unavailable; the request still carries its durable requestId.
  }
};

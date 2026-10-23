import type { OrderActionRequest } from '../types/orders.types';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const KINDS = new Set([
  'claimed',
  'released',
  'reassigned',
  'checked',
  'note',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
]);

export const readOrderCheckpoint = (
  key: string,
): { pending: OrderActionRequest | null; error: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { pending: null, error: '' };
    const value: unknown = JSON.parse(raw);
    if (
      !record(value) ||
      typeof value.requestId !== 'string' ||
      !/^[a-zA-Z0-9-]{16,100}$/.test(value.requestId) ||
      typeof value.kind !== 'string' ||
      !KINDS.has(value.kind) ||
      typeof value.orderId !== 'string' ||
      !value.orderId
    )
      throw new Error('Invalid action');
    if (value.kind === 'reassigned' && typeof value.userId !== 'string')
      throw new Error('Invalid reassign');
    if (
      value.kind === 'checked' &&
      (typeof value.productId !== 'string' ||
        typeof value.checked !== 'boolean')
    )
      throw new Error('Invalid checklist');
    if (value.kind === 'note' && typeof value.note !== 'string')
      throw new Error('Invalid note');
    if (value.kind === 'cancelled' && typeof value.reason !== 'string')
      throw new Error('Invalid cancel');
    return { pending: value as unknown as OrderActionRequest, error: '' };
  } catch {
    return {
      pending: null,
      error:
        'Recuperarea locală a acțiunii pe comandă nu este disponibilă. Verifică operațiunile anterioare și accesul la stocarea browserului.',
    };
  }
};

export const writeOrderCheckpoint = (
  key: string,
  request: OrderActionRequest,
) => {
  try {
    localStorage.setItem(key, JSON.stringify(request));
  } catch {
    // Storage unavailable; the request still carries its durable requestId.
  }
};

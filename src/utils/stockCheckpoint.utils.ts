import type { StockOperationRequest } from '../types/inventory.types';

const record = (value: unknown): value is Record<string, unknown> =>
 typeof value === 'object' && value !== null;
const integer = (value: unknown): value is number =>
 typeof value === 'number' && Number.isSafeInteger(value);

export const readStockCheckpoint = (
 key: string,
): { pending: StockOperationRequest | null; error: string } => {
 try {
 const raw = localStorage.getItem(key);
 if (!raw) return { pending: null, error: '' };
 const value: unknown = JSON.parse(raw);
 if (
 !record(value) ||
 typeof value.requestId !== 'string' ||
 !/^[a-zA-Z0-9-]{16,100}$/.test(value.requestId) ||
 typeof value.productId !== 'string' ||
 !value.productId ||
 (value.fairId !== undefined &&
 (typeof value.fairId !== 'string' || !value.fairId))
 )
 throw new Error('Invalid operation');
 if (value.kind === 'receipt') {
 if (!integer(value.quantity) || value.quantity <= 0)
 throw new Error('Invalid receipt');
 } else if (value.kind === 'adjustment') {
 if (
 !integer(value.delta) ||
 value.delta === 0 ||
 typeof value.reason !== 'string' ||
 typeof value.note !== 'string'
 )
 throw new Error('Invalid adjustment');
 } else if (value.kind === 'count') {
 if (
 !integer(value.expectedQuantity) ||
 !integer(value.countedQuantity) ||
 (value.lastMovementId !== null &&
 typeof value.lastMovementId !== 'string')
 )
 throw new Error('Invalid count');
 } else throw new Error('Invalid kind');
 return { pending: value as unknown as StockOperationRequest, error: '' };
 } catch {
 return {
 pending: null,
 error:
 'Recuperarea locală a operațiunii de stoc nu este disponibilă. Verifică operațiunile anterioare și accesul la stocarea browserului înainte de altă operațiune.',
 };
 }
};

export const writeStockCheckpoint = (
 key: string,
 request: StockOperationRequest,
) => {
 try {
 localStorage.setItem(key, JSON.stringify(request));
 } catch {
 // Storage unavailable; the request still carries its durable requestId.
 }
};

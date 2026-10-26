import { ConvexError } from 'convex/values';
import type { PaymentCheckpoint } from './pos.types';

const currency = new Intl.NumberFormat('ro-RO', {
 style: 'currency',
 currency: 'RON',
});

export const formatMoney = (cents: number) => currency.format(cents / 100);

export const parseMoney = (value: string): number | null => {
 const normalized = value.trim().replace(',', '.');
 if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
 const cents = Math.round(Number(normalized) * 100);
 return Number.isSafeInteger(cents) ? cents : null;
};

export type PosDiscountMode = 'fixed' | 'percent' | 'final';

export const computeDiscountCents = (
 mode: PosDiscountMode,
 raw: string,
 subtotalCents: number,
): number => {
 const value = raw.trim();
 if (!value || !Number.isSafeInteger(subtotalCents) || subtotalCents <= 0) {
 return 0;
 }
 if (mode === 'percent') {
 const percent = Number(value.replace(',', '.'));
 if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return 0;
 return Math.min(
 subtotalCents,
 Math.round((subtotalCents * percent) / 100),
 );
 }
 const cents = parseMoney(value);
 if (cents === null) return 0;
 if (mode === 'final') {
 return Math.max(0, Math.min(subtotalCents, subtotalCents - cents));
 }
 return Math.min(subtotalCents, cents);
};

export const errorMessage = (error: unknown) =>
 error instanceof ConvexError && typeof error.data === 'string'
 ? error.data
 : 'Salvarea nu este confirmata. Verifica operatiunea; nu incasa din nou.';

export const searchText = (value: string) =>
 value
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')
 .toLocaleLowerCase('ro');

const isRecord = (value: unknown): value is Record<string, unknown> =>
 typeof value === 'object' && value !== null;

export const readCheckpoint = (
 key: string,
): { pending: PaymentCheckpoint | null; error: string } => {
 try {
 const raw = localStorage.getItem(key);
 if (!raw) return { pending: null, error: '' };
 const data: unknown = JSON.parse(raw);
 if (!isRecord(data) || !isRecord(data.args))
 throw new Error('Invalid checkpoint');
 const { args } = data;
 if (
 (data.phase !== 'prepared' && data.phase !== 'paid') ||
 typeof args.requestId !== 'string' ||
 !/^[a-zA-Z0-9-]{16,100}$/.test(args.requestId) ||
 typeof args.fairId !== 'string' ||
 (args.paymentMethod !== 'cash' && args.paymentMethod !== 'card') ||
 typeof args.discountCents !== 'number' ||
 !Number.isSafeInteger(args.discountCents) ||
 args.discountCents < 0 ||
 typeof args.discountReason !== 'string' ||
 !Array.isArray(args.items) ||
 !args.items.length ||
 !args.items.every(
 (item: unknown) =>
 isRecord(item) &&
 typeof item.productId === 'string' &&
 typeof item.quantity === 'number' &&
 Number.isSafeInteger(item.quantity) &&
 item.quantity > 0 &&
 typeof item.expectedUnitPriceCents === 'number' &&
 Number.isSafeInteger(item.expectedUnitPriceCents) &&
 item.expectedUnitPriceCents >= 0,
 ) ||
 (data.receivedCents !== undefined &&
 (typeof data.receivedCents !== 'number' ||
 !Number.isSafeInteger(data.receivedCents) ||
 data.receivedCents < 0)) ||
 (data.phase === 'paid' &&
 args.paymentMethod === 'cash' &&
 data.receivedCents === undefined)
 ) {
 throw new Error('Invalid checkpoint');
 }
 return { pending: data as unknown as PaymentCheckpoint, error: '' };
 } catch {
 return {
 pending: null,
 error:
 'Recuperarea locala nu este disponibila. Nu incasa pana cand operatiunile anterioare nu sunt verificate si stocarea browserului nu este accesibila.',
 };
 }
};

export const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
 let timer: ReturnType<typeof setTimeout> | undefined;
 try {
 return await Promise.race([
 promise,
 new Promise<never>((_, reject) => {
 timer = setTimeout(
 () => reject(new Error('Unconfirmed operation')),
 15000,
 );
 }),
 ]);
 } finally {
 clearTimeout(timer);
 }
};

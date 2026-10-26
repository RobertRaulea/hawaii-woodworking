import type { FunctionArgs, FunctionReturnType } from 'convex/server';
import type { api } from '../../../../convex/_generated/api';

export type PosProduct = FunctionReturnType<typeof api.pos.workspace>[number];
export type PrepareArgs = FunctionArgs<typeof api.pos.prepare>;
export type PaymentMethod = PrepareArgs['paymentMethod'];
export type PosAttempt = FunctionReturnType<typeof api.pos.prepare>;

export interface CartLine {
 product: PosProduct;
 quantity: number;
}

export interface PaymentCheckpoint {
 args: PrepareArgs;
 phase: 'prepared' | 'paid';
 receivedCents?: number;
}

export interface CompletedSale {
 requestId: string;
 totalCents: number;
 changeCents: number;
}

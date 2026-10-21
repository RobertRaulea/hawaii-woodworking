import type { FunctionArgs, FunctionReturnType } from 'convex/server';
import type { api } from '../../convex/_generated/api';

export type StockOverview = FunctionReturnType<typeof api.pos.getStockOverview>;
export type InventoryProduct = StockOverview['products'][number];
export type InventoryFair = StockOverview['fairs'][number];
export type InventoryReceipt = NonNullable<
  FunctionReturnType<typeof api.pos.getInventoryOperation>
>;
export type TransferDirection = 'to_fair' | 'to_online';
export type TransferRequest = FunctionArgs<typeof api.pos.transfer> & {
  kind: 'transfer';
  direction: TransferDirection;
};
export type ArchiveRequest = FunctionArgs<typeof api.pos.archiveFair> & {
  kind: 'archive';
};
export type InventoryRequest = TransferRequest | ArchiveRequest;
export type NewInventoryRequest = (
  | Omit<TransferRequest, 'requestId'>
  | Omit<ArchiveRequest, 'requestId'>
) & { requestId?: string };

export interface InventoryController {
  pending: InventoryRequest | null;
  completed: InventoryReceipt | null;
  busy: boolean;
  online: boolean;
  blocked: boolean;
  error: string;
  start: (request: NewInventoryRequest) => Promise<void>;
  retry: () => Promise<void>;
  dismissCompleted: () => void;
}

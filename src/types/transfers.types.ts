import type { FunctionArgs, FunctionReturnType } from 'convex/server';
import { api } from '../../convex/_generated/api';

export type TransferListItem =
 FunctionReturnType<typeof api.transfers.list>[number];
export type TransferDetail = NonNullable<
 FunctionReturnType<typeof api.transfers.get>
>;
export type TransferDoc = TransferDetail['transfer'];
export type TransferEvent = TransferDetail['events'][number];
export type TransferStatus = TransferDoc['status'];

export type TransferActionRequest =
 | (FunctionArgs<typeof api.transfers.request> & { kind: 'requested' })
 | (FunctionArgs<typeof api.transfers.create> & { kind: 'created' })
 | (FunctionArgs<typeof api.transfers.updateDraft> & { kind: 'updated' })
 | (FunctionArgs<typeof api.transfers.accept> & { kind: 'accepted' })
 | (FunctionArgs<typeof api.transfers.ship> & { kind: 'shipped' })
 | (FunctionArgs<typeof api.transfers.receive> & { kind: 'received' })
 | (FunctionArgs<typeof api.transfers.cancel> & { kind: 'cancelled' });

type WithoutRequestId<T> = T extends { requestId: string }
 ? Omit<T, 'requestId'> & { requestId?: string }
 : never;

export type NewTransferActionRequest =
 WithoutRequestId<TransferActionRequest>;

export interface TransferActionController {
 pending: TransferActionRequest | null;
 completed: TransferEvent | null;
 busy: boolean;
 online: boolean;
 blocked: boolean;
 error: string;
 start: (request: NewTransferActionRequest) => Promise<void>;
 retry: () => Promise<void>;
 dismissCompleted: () => void;
}

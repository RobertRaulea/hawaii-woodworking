import type { FunctionArgs, FunctionReturnType } from 'convex/server';
import { api } from '../../convex/_generated/api';

export type OrderAdminRow =
  FunctionReturnType<typeof api.orders.listAdmin>[number];
export type OrderAdminDetail = NonNullable<
  FunctionReturnType<typeof api.orders.getAdmin>
>;
export type OrderAdminEvent = OrderAdminDetail['events'][number];
export type FulfillmentQueueItem =
  FunctionReturnType<typeof api.fulfillment.queue>[number];
export type FulfillmentDetail = NonNullable<
  FunctionReturnType<typeof api.fulfillment.get>
>;
export type FulfillmentEvent = FulfillmentDetail['events'][number];

export type OrderActionRequest =
  | (FunctionArgs<typeof api.fulfillment.claim> & { kind: 'claimed' })
  | (FunctionArgs<typeof api.fulfillment.release> & { kind: 'released' })
  | (FunctionArgs<typeof api.fulfillment.reassign> & { kind: 'reassigned' })
  | (FunctionArgs<typeof api.fulfillment.setChecked> & { kind: 'checked' })
  | (FunctionArgs<typeof api.fulfillment.addNote> & { kind: 'note' })
  | (FunctionArgs<typeof api.fulfillment.markPacked> & { kind: 'packed' })
  | (FunctionArgs<typeof api.fulfillment.ship> & { kind: 'shipped' })
  | (FunctionArgs<typeof api.fulfillment.markDelivered> & {
      kind: 'delivered';
    })
  | (FunctionArgs<typeof api.orders.cancel> & { kind: 'cancelled' });

type WithoutRequestId<T> = T extends { requestId: string }
  ? Omit<T, 'requestId'> & { requestId?: string }
  : never;

export type NewOrderActionRequest = WithoutRequestId<OrderActionRequest>;

export interface OrderActionController {
  pending: OrderActionRequest | null;
  completed: FulfillmentEvent | null;
  busy: boolean;
  online: boolean;
  blocked: boolean;
  error: string;
  start: (request: NewOrderActionRequest) => Promise<void>;
  retry: () => Promise<void>;
  dismissCompleted: () => void;
}

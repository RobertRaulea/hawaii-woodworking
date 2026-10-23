import type { Doc } from "../_generated/dataModel";

export type PaymentStatus = "paid" | "cancelled" | "pending";

export type FulfillmentState =
  | "cancelled"
  | "delivered"
  | "shipped"
  | "packed"
  | "preparing"
  | "ready"
  | "blocked";

export const paymentStatus = (order: Doc<"orders">): PaymentStatus => {
  if (
    order.paymentConfirmedAt !== undefined ||
    (order.inventoryStatus === undefined &&
      (order.status === "paid" ||
        order.status === "shipped" ||
        order.status === "delivered"))
  ) {
    return "paid";
  }
  if (order.status === "cancelled") return "cancelled";
  return "pending";
};

export const isFulfillEligible = (order: Doc<"orders">) =>
  order.status === "paid" &&
  paymentStatus(order) === "paid" &&
  (order.inventoryStatus === "applied" ||
    order.inventoryStatus === undefined);

export const fulfillmentState = (order: Doc<"orders">): FulfillmentState => {
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "delivered") return "delivered";
  if (order.status === "shipped") return "shipped";
  if (order.fulfillmentStatus === "packed") return "packed";
  if (order.fulfillmentStatus === "preparing") return "preparing";
  if (isFulfillEligible(order)) return "ready";
  return "blocked";
};

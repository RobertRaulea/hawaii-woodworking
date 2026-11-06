import type { Doc } from "../_generated/dataModel";
import { toCents } from "./pos.utils";

export type PaymentStatus = "paid" | "cancelled" | "pending";

export type FulfillmentState =
  | "cancelled"
  | "returned"
  | "delivered"
  | "shipped"
  | "packed"
  | "preparing"
  | "ready"
  | "blocked";

export const paymentStatus = (order: Doc<"orders">): PaymentStatus => {
  if (
    order.paymentConfirmedAt !== undefined ||
    // A returned legacy order was necessarily paid (or COD-delivered) to get
    // there; new refused COD parcels always carry an inventoryStatus.
    (order.inventoryStatus === undefined &&
      (order.status === "paid" ||
        order.status === "shipped" ||
        order.status === "delivered" ||
        order.status === "returned"))
  ) {
    return "paid";
  }
  // A refused COD parcel closes unpaid; it is not a pending payment.
  if (order.status === "cancelled" || order.status === "returned")
    return "cancelled";
  return "pending";
};

export const customerSpend = (orders: readonly Doc<"orders">[]): number =>
  orders.reduce(
    (sum, order) =>
      sum +
      (order.status !== "cancelled" &&
      order.status !== "returned" &&
      paymentStatus(order) === "paid"
        ? toCents(order.total)
        : 0),
    0,
  ) / 100;

export const isFulfillEligible = (order: Doc<"orders">) =>
  (order.status === "paid" &&
    paymentStatus(order) === "paid" &&
    (order.inventoryStatus === "applied" ||
      order.inventoryStatus === undefined)) ||
  // COD orders ship against applied stock; cash is collected on delivery.
  (order.paymentMethod === "cod" &&
    order.status !== "cancelled" &&
    order.status !== "returned" &&
    order.inventoryStatus === "applied");

export const fulfillmentState = (order: Doc<"orders">): FulfillmentState => {
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "returned") return "returned";
  if (order.status === "delivered") return "delivered";
  if (order.status === "shipped") return "shipped";
  if (order.fulfillmentStatus === "packed") return "packed";
  if (order.fulfillmentStatus === "preparing") return "preparing";
  if (isFulfillEligible(order)) return "ready";
  return "blocked";
};

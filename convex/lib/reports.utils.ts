// Pure aggregation helpers for admin reports. No ctx access — every function
// works on plain documents so summary and dashboard share identical math.
import type { Doc } from "../_generated/dataModel";
import { businessDate, toCents } from "./pos.utils";
import {
  fulfillmentState,
  paymentStatus,
  type FulfillmentState,
} from "./orders.utils";

export interface ReportTotals {
  grossCents: number;
  discountCents: number;
  returnsCents: number;
  netCents: number;
  count: number;
  units: number;
  returnCount: number;
  returnUnits: number;
}

export const emptyTotals = (): ReportTotals => ({
  grossCents: 0,
  discountCents: 0,
  returnsCents: 0,
  netCents: 0,
  count: 0,
  units: 0,
  returnCount: 0,
  returnUnits: 0,
});

export const addTotals = (a: ReportTotals, b: ReportTotals): ReportTotals => ({
  grossCents: a.grossCents + b.grossCents,
  discountCents: a.discountCents + b.discountCents,
  returnsCents: a.returnsCents + b.returnsCents,
  netCents: a.netCents + b.netCents,
  count: a.count + b.count,
  units: a.units + b.units,
  returnCount: a.returnCount + b.returnCount,
  returnUnits: a.returnUnits + b.returnUnits,
});

const inPeriod = (date: string, from: string, to: string) =>
  date >= from && date <= to;

export const orderSaleTs = (order: Doc<"orders">) =>
  order.paymentConfirmedAt ?? order.createdAt;

export const orderSaleDate = (order: Doc<"orders">) =>
  businessDate(orderSaleTs(order));

export const orderReturnDate = (order: Doc<"orders">) =>
  businessDate(Math.max(order.cancelledAt ?? orderSaleTs(order), orderSaleTs(order)));

export const orderGrossCents = (order: Doc<"orders">) =>
  order.items.reduce(
    (sum, item) => sum + toCents(item.price) * item.quantity,
    0,
  );

export const orderDiscountCents = (order: Doc<"orders">) =>
  Math.max(0, orderGrossCents(order) - toCents(order.total));

export const orderUnits = (order: Doc<"orders">) =>
  order.items.reduce((sum, item) => sum + item.quantity, 0);

const isPaidOrder = (order: Doc<"orders">) => paymentStatus(order) === "paid";

export const onlineSales = (
  orders: Doc<"orders">[],
  from: string,
  to: string,
): ReportTotals => {
  const totals = emptyTotals();
  for (const order of orders) {
    if (!isPaidOrder(order)) continue;
    const gross = orderGrossCents(order);
    const discount = orderDiscountCents(order);
    if (inPeriod(orderSaleDate(order), from, to)) {
      totals.grossCents += gross;
      totals.discountCents += discount;
      totals.count += 1;
      totals.units += orderUnits(order);
    }
    if (
      order.status === "cancelled" &&
      inPeriod(orderReturnDate(order), from, to)
    ) {
      totals.returnsCents += gross - discount;
      totals.returnCount += 1;
      totals.returnUnits += orderUnits(order);
    }
  }
  totals.netCents =
    totals.grossCents - totals.discountCents - totals.returnsCents;
  return totals;
};

export const posTotals = (sales: Doc<"posSales">[]): ReportTotals & {
  cashCents: number;
  cardCents: number;
} => {
  const totals = { ...emptyTotals(), cashCents: 0, cardCents: 0 };
  for (const sale of sales) {
    totals.grossCents += sale.subtotalCents;
    totals.discountCents += sale.discountCents;
    totals.netCents += sale.totalCents;
    totals.count += 1;
    totals.units += sale.items.reduce((sum, item) => sum + item.quantity, 0);
    if (sale.paymentMethod === "cash") totals.cashCents += sale.totalCents;
    else totals.cardCents += sale.totalCents;
  }
  return totals;
};

export interface Collections {
  posCashCents: number | null;
  posCardCents: number | null;
  onlineCardConfirmedCents: number | null;
  onlineCardConfirmedCount: number | null;
  onlineUnverifiedCents: number | null;
  onlineUnverifiedCount: number | null;
  refundsManualCents: number | null;
  refundsManualCount: number | null;
}

export const collections = (
  orders: Doc<"orders">[] | null,
  sales: Doc<"posSales">[] | null,
  from: string,
  to: string,
): Collections => {
  const result: Collections = {
    posCashCents: sales === null ? null : 0,
    posCardCents: sales === null ? null : 0,
    onlineCardConfirmedCents: orders === null ? null : 0,
    onlineCardConfirmedCount: orders === null ? null : 0,
    onlineUnverifiedCents: orders === null ? null : 0,
    onlineUnverifiedCount: orders === null ? null : 0,
    refundsManualCents: orders === null ? null : 0,
    refundsManualCount: orders === null ? null : 0,
  };
  for (const sale of sales ?? []) {
    if (!inPeriod(sale.businessDate, from, to)) continue;
    if (sale.paymentMethod === "cash") result.posCashCents! += sale.totalCents;
    else result.posCardCents! += sale.totalCents;
  }
  for (const order of orders ?? []) {
    if (!isPaidOrder(order)) continue;
    if (
      order.paymentConfirmedAt !== undefined &&
      inPeriod(businessDate(order.paymentConfirmedAt), from, to)
    ) {
      result.onlineCardConfirmedCents! += toCents(order.total);
      result.onlineCardConfirmedCount! += 1;
    }
    if (
      order.paymentConfirmedAt === undefined &&
      inPeriod(orderSaleDate(order), from, to)
    ) {
      result.onlineUnverifiedCents! += toCents(order.total);
      result.onlineUnverifiedCount! += 1;
    }
    if (
      order.refundStatus === "manual_required" &&
      order.status === "cancelled" &&
      inPeriod(orderReturnDate(order), from, to)
    ) {
      result.refundsManualCents! +=
        orderGrossCents(order) - orderDiscountCents(order);
      result.refundsManualCount! += 1;
    }
  }
  return result;
};

export interface OrdersByState {
  byPayment: Record<"pending" | "paid" | "cancelled", { count: number; valueCents: number }>;
  byFulfillment: Record<FulfillmentState, number>;
}

const FULFILLMENT_STATES: FulfillmentState[] = [
  "cancelled",
  "delivered",
  "shipped",
  "packed",
  "preparing",
  "ready",
  "blocked",
];

export const ordersByState = (
  orders: Doc<"orders">[],
  from: string,
  to: string,
): OrdersByState => {
  const result: OrdersByState = {
    byPayment: {
      pending: { count: 0, valueCents: 0 },
      paid: { count: 0, valueCents: 0 },
      cancelled: { count: 0, valueCents: 0 },
    },
    byFulfillment: Object.fromEntries(
      FULFILLMENT_STATES.map((state) => [state, 0]),
    ) as Record<FulfillmentState, number>,
  };
  for (const order of orders) {
    if (!inPeriod(businessDate(order.createdAt), from, to)) continue;
    const status = paymentStatus(order);
    result.byPayment[status].count += 1;
    result.byPayment[status].valueCents += toCents(order.total);
    result.byFulfillment[fulfillmentState(order)] += 1;
  }
  return result;
};

export interface FairTotals {
  fairId: Doc<"fairs">["_id"];
  fairName: string;
  grossCents: number;
  discountCents: number;
  netCents: number;
  cashCents: number;
  cardCents: number;
  count: number;
  units: number;
}

export const posByFair = (
  sales: Doc<"posSales">[],
  fairs: Doc<"fairs">[],
): FairTotals[] => {
  const names = new Map(fairs.map((fair) => [fair._id, fair.name]));
  const byFair = new Map<string, FairTotals>();
  for (const sale of sales) {
    const row = byFair.get(sale.fairId) ?? {
      fairId: sale.fairId,
      fairName: names.get(sale.fairId) ?? "Târg indisponibil",
      grossCents: 0,
      discountCents: 0,
      netCents: 0,
      cashCents: 0,
      cardCents: 0,
      count: 0,
      units: 0,
    };
    row.grossCents += sale.subtotalCents;
    row.discountCents += sale.discountCents;
    row.netCents += sale.totalCents;
    if (sale.paymentMethod === "cash") row.cashCents += sale.totalCents;
    else row.cardCents += sale.totalCents;
    row.count += 1;
    row.units += sale.items.reduce((sum, item) => sum + item.quantity, 0);
    byFair.set(sale.fairId, row);
  }
  return [...byFair.values()].sort((a, b) => b.netCents - a.netCents);
};

export interface ProductSold {
  productId: string;
  name: string;
  onlineUnits: number;
  onlineReturnedUnits: number;
  posUnits: number;
  units: number;
  grossCents: number;
}

export const productsSold = (
  orders: Doc<"orders">[],
  sales: Doc<"posSales">[],
  from: string,
  to: string,
): ProductSold[] => {
  const rows = new Map<string, ProductSold>();
  const row = (productId: string, name: string) => {
    const existing = rows.get(productId);
    if (existing) {
      existing.name = name; // latest snapshot name seen wins
      return existing;
    }
    const created: ProductSold = {
      productId,
      name,
      onlineUnits: 0,
      onlineReturnedUnits: 0,
      posUnits: 0,
      units: 0,
      grossCents: 0,
    };
    rows.set(productId, created);
    return created;
  };
  for (const order of orders) {
    if (!isPaidOrder(order)) continue;
    const soldHere = inPeriod(orderSaleDate(order), from, to);
    const returnedHere =
      order.status === "cancelled" &&
      inPeriod(orderReturnDate(order), from, to);
    for (const item of order.items) {
      if (!soldHere && !returnedHere) continue;
      const entry = row(item.productId, item.name);
      if (soldHere) {
        entry.onlineUnits += item.quantity;
        entry.grossCents += toCents(item.price) * item.quantity;
      }
      if (returnedHere) entry.onlineReturnedUnits += item.quantity;
    }
  }
  for (const sale of sales) {
    if (!inPeriod(sale.businessDate, from, to)) continue;
    for (const item of sale.items) {
      const entry = row(item.productId, item.name);
      entry.posUnits += item.quantity;
      entry.grossCents += item.unitPriceCents * item.quantity;
    }
  }
  for (const entry of rows.values()) {
    entry.units = entry.onlineUnits - entry.onlineReturnedUnits + entry.posUnits;
  }
  return [...rows.values()].sort(
    (a, b) => b.units - a.units || a.name.localeCompare(b.name),
  );
};

export const eachDate = (from: string, to: string): string[] => {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

export interface DayRow {
  date: string;
  onlineNetCents: number;
  posNetCents: number;
}

export const byDay = (
  orders: Doc<"orders">[],
  sales: Doc<"posSales">[],
  from: string,
  to: string,
): DayRow[] => {
  const rows = new Map<string, DayRow>();
  for (const date of eachDate(from, to)) {
    rows.set(date, { date, onlineNetCents: 0, posNetCents: 0 });
  }
  for (const order of orders) {
    if (!isPaidOrder(order)) continue;
    const saleDay = rows.get(orderSaleDate(order));
    if (saleDay) {
      saleDay.onlineNetCents += orderGrossCents(order) - orderDiscountCents(order);
    }
    if (order.status === "cancelled") {
      const returnDay = rows.get(orderReturnDate(order));
      if (returnDay) {
        returnDay.onlineNetCents -=
          orderGrossCents(order) - orderDiscountCents(order);
      }
    }
  }
  for (const sale of sales) {
    const day = rows.get(sale.businessDate);
    if (day) day.posNetCents += sale.totalCents;
  }
  return [...rows.values()];
};

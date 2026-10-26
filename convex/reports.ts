import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { authorizedFairIds, requirePermission } from "./lib/auth";
import { hasPermission } from "./lib/permissions";
import {
  balanceNeedsReconciliation,
  isStockQuantity,
  onlineHeldQuantity,
  onlineReviewClaims,
} from "./lib/inventory.utils";
import { productStatus } from "./lib/products.utils";
import { fulfillmentState } from "./lib/orders.utils";
import { fairLocationName } from "./transfers";
import {
  addTotals,
  byDay,
  collections,
  emptyTotals,
  onlineSales,
  type ReportTotals,
  ordersByState,
  posByFair,
  posTotals,
  productsSold,
} from "./lib/reports.utils";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value: string) => {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const validatePeriod = (from: string, to: string) => {
  if (!isValidDate(from) || !isValidDate(to)) {
    throw new ConvexError("Data este invalidă. Folosește formatul AAAA-LL-ZZ.");
  }
  if (from > to) {
    throw new ConvexError(
      "Perioada este invalidă: „de la“ trebuie să fie înainte de „până la“.",
    );
  }
  const spanDays =
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86400000 +
    1;
  if (spanDays > 366) {
    throw new ConvexError("Perioada nu poate depăși 366 de zile.");
  }
};

const TOO_MANY =
  "Prea multe înregistrări pentru calcul direct; restrânge perioada.";

const loadOrders = async (ctx: QueryCtx) => {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_createdAt")
    .collect();
  if (orders.length > 10000) throw new ConvexError(TOO_MANY);
  return orders;
};

const loadPosSales = async (
  ctx: QueryCtx,
  from: string,
  to: string,
  fairId?: Id<"fairs">,
) => {
  const fairIds = fairId
    ? [fairId]
    : (await ctx.db.query("fairs").collect()).map((fair) => fair._id);
  const sales: Doc<"posSales">[] = [];
  for (const id of fairIds) {
    const rows = await ctx.db
      .query("posSales")
      .withIndex("by_fair_date", (q) =>
        q
          .eq("fairId", id)
          .gte("businessDate", from)
          .lte("businessDate", to),
      )
      .collect();
    sales.push(...rows);
  }
  if (sales.length > 10000) throw new ConvexError(TOO_MANY);
  return sales;
};

const toReportTotals = (t: ReportTotals): ReportTotals => ({
  grossCents: t.grossCents,
  discountCents: t.discountCents,
  returnsCents: t.returnsCents,
  netCents: t.netCents,
  count: t.count,
  units: t.units,
  returnCount: t.returnCount,
  returnUnits: t.returnUnits,
});

const computeReport = (
  orders: Doc<"orders">[] | null,
  sales: Doc<"posSales">[] | null,
  fairs: Doc<"fairs">[],
  from: string,
  to: string,
) => {
  const online = orders === null ? null : onlineSales(orders, from, to);
  const pos = sales === null ? null : toReportTotals(posTotals(sales));
  const total = addTotals(online ?? emptyTotals(), pos ?? emptyTotals());
  return {
    sales: { online, pos, total },
    collections: collections(orders, sales, from, to),
    ordersByState: orders === null ? null : ordersByState(orders, from, to),
    posByFair: sales === null ? null : posByFair(sales, fairs),
    productsSold: productsSold(orders ?? [], sales ?? [], from, to),
    byDay: byDay(orders ?? [], sales ?? [], from, to),
  };
};

export const summary = query({
  args: {
    from: v.string(),
    to: v.string(),
    channel: v.union(
      v.literal("all"),
      v.literal("online"),
      v.literal("pos"),
    ),
    fairId: v.optional(v.id("fairs")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "reports.view");
    validatePeriod(args.from, args.to);

    const channel = args.fairId ? "pos" : args.channel;
    if (args.fairId) {
      const fair = await ctx.db.get(args.fairId);
      if (!fair) throw new ConvexError("Târgul nu există.");
    }
    const includeOnline = channel !== "pos";
    const includePos = channel !== "online";
    const fairs = includePos ? await ctx.db.query("fairs").collect() : [];
    const orders = includeOnline ? await loadOrders(ctx) : null;
    const sales = includePos
      ? await loadPosSales(ctx, args.from, args.to, args.fairId)
      : null;
    const report = computeReport(orders, sales, fairs, args.from, args.to);

    return {
      period: {
        from: args.from,
        to: args.to,
        timeZone: "Europe/Bucharest" as const,
      },
      filters: { channel, fairId: args.fairId },
      sales: report.sales,
      posReturnsTracked: false,
      collections: report.collections,
      ordersByState: report.ordersByState,
      posByFair: report.posByFair,
      productsSold: report.productsSold,
      byDay: report.byDay,
    };
  },
});

const lowStockSection = async (ctx: QueryCtx) => {
  const [products, claims] = await Promise.all([
    ctx.db.query("products").collect(),
    onlineReviewClaims(ctx),
  ]);
  const rows = products
    .filter(
      (product) =>
        productStatus(product) === "active" && product.trackStock !== false,
    )
    .map((product) => {
      const physical = product.stock ?? 0;
      if (!isStockQuantity(physical)) {
        return {
          productId: product._id,
          name: product.name_ro || product.name,
          sku: product.sku ?? "",
          available: null,
          invalid: true,
          threshold: product.lowStockThreshold ?? 5,
        };
      }
      const held = onlineHeldQuantity(physical, claims.get(product._id) ?? 0);
      return {
        productId: product._id,
        name: product.name_ro || product.name,
        sku: product.sku ?? "",
        available: physical - held,
        invalid: false,
        threshold: product.lowStockThreshold ?? 5,
      };
    })
    .filter((row) => row.invalid || row.available! <= row.threshold)
    .sort(
      (a, b) =>
        Number(b.invalid) - Number(a.invalid) ||
        (a.available ?? -1) - (b.available ?? -1),
    );
  return { count: rows.length, rows: rows.slice(0, 10) };
};

const transfersSection = async (
  ctx: QueryCtx,
  subject: string,
  scoped: boolean,
) => {
  const [inTransit, partial] = await Promise.all([
    ctx.db
      .query("transfers")
      .withIndex("by_status", (q) => q.eq("status", "in_transit"))
      .collect(),
    ctx.db
      .query("transfers")
      .withIndex("by_status", (q) => q.eq("status", "partially_received"))
      .collect(),
  ]);
  const open = [...inTransit, ...partial].filter(
    (transfer) => !scoped || transfer.createdBy === subject,
  );
  const inTransitUnits = open.reduce(
    (total, transfer) =>
      total +
      transfer.lines.reduce(
        (sum, line) =>
          sum + Math.max(0, line.shippedQuantity - line.receivedQuantity),
        0,
      ),
    0,
  );
  const rows = await Promise.all(
    open.slice(0, 10).map(async (transfer) => ({
      _id: transfer._id,
      fromName: await fairLocationName(
        ctx,
        transfer.fromLocation,
        transfer.fromFairId,
      ),
      toName: await fairLocationName(
        ctx,
        transfer.toLocation,
        transfer.toFairId,
      ),
      status: transfer.status,
      inTransitUnits: transfer.lines.reduce(
        (sum, line) =>
          sum + Math.max(0, line.shippedQuantity - line.receivedQuantity),
        0,
      ),
      shippedAt: transfer.shippedAt,
    })),
  );
  return { count: open.length, inTransitUnits, rows };
};

export const dashboard = query({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const staff = await requirePermission(ctx, "dashboard.view");
    if (!isValidDate(today)) {
      throw new ConvexError(
        "Data este invalidă. Folosește formatul AAAA-LL-ZZ.",
      );
    }
    const role = staff.role;
    const canReports = hasPermission(role, "reports.view");
    const canFulfill = hasPermission(role, "orders.fulfill");
    const canInventory = hasPermission(role, "inventory.readAll");
    const canTransfers = hasPermission(role, "transfers.view");
    const canReconcile = hasPermission(role, "inventory.reconcile");
    const canPos = hasPermission(role, "pos.sell") && !canReports;

    const orders =
      canReports || canFulfill || canReconcile ? await loadOrders(ctx) : [];

    const sales = canReports
      ? await (async () => {
          const month = `${today.slice(0, 7)}-01`;
          const todaySales = await loadPosSales(ctx, today, today);
          const monthSales = await loadPosSales(ctx, month, today);
          const todayReport = computeReport(orders, todaySales, [], today, today);
          const monthReport = computeReport(orders, monthSales, [], month, today);
          return {
            today: {
              sales: todayReport.sales,
              collections: todayReport.collections,
            },
            month: {
              sales: monthReport.sales,
              collections: monthReport.collections,
            },
          };
        })()
      : null;

    const fulfillment = canFulfill
      ? orders.reduce(
          (counts, order) => {
            const state = fulfillmentState(order);
            if (
              state === "ready" ||
              state === "preparing" ||
              state === "packed"
            ) {
              counts[state] += 1;
            }
            return counts;
          },
          { ready: 0, preparing: 0, packed: 0 },
        )
      : null;

    const lowStock = canInventory ? await lowStockSection(ctx) : null;

    const transfers = canTransfers
      ? await transfersSection(ctx, staff.identity.subject, role === "seller")
      : null;

    const exceptions = canReconcile
      ? await (async () => {
          const needsReview = orders.filter(
            (order) => order.inventoryStatus === "needs_review",
          ).length;
          const [balances, products, fairs] = await Promise.all([
            ctx.db.query("fairInventory").collect(),
            ctx.db.query("products").collect(),
            ctx.db.query("fairs").collect(),
          ]);
          const knownIds = new Set(products.map((product) => product._id));
          const activeFairs = new Set(
            fairs.filter((fair) => fair.active).map((fair) => fair._id),
          );
          const invalidBalances = balances.filter((balance) =>
            balanceNeedsReconciliation(balance, knownIds, activeFairs),
          ).length;
          const posPrepared = canReports
            ? (
                await Promise.all(
                  fairs.map((fair) =>
                    ctx.db
                      .query("posAttempts")
                      .withIndex("by_fair_status", (q) =>
                        q.eq("fairId", fair._id).eq("status", "prepared"),
                      )
                      .collect(),
                  ),
                )
              ).reduce((sum, rows) => sum + rows.length, 0)
            : null;
          return { needsReview, posPrepared, invalidBalances };
        })()
      : null;

    const pos = canPos
      ? await (async () => {
          const authorized = await authorizedFairIds(ctx, staff);
          if (authorized === "all") return [];
          const fairs = (await ctx.db.query("fairs").collect()).filter(
            (fair) => fair.active && authorized.has(fair._id),
          );
          return Promise.all(
            fairs.map(async (fair) => {
              const sales = await loadPosSales(ctx, today, today, fair._id);
              const totals = posTotals(sales);
              return {
                fairId: fair._id,
                fairName: fair.name,
                netCents: totals.netCents,
                cashCents: totals.cashCents,
                cardCents: totals.cardCents,
                count: totals.count,
                units: totals.units,
              };
            }),
          );
        })()
      : null;

    return {
      today,
      sales,
      fulfillment,
      lowStock,
      transfers,
      exceptions,
      pos,
    };
  },
});

import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { requestIdIsValid, stockQuantity } from "./inventory.utils";
import { paymentStatus } from "./orders.utils";

export interface OrderCancelResult {
  order: Doc<"orders"> | null;
  // True only when this call moved the order into "cancelled"; replays and
  // the paid-after-cancel release path return false so callers do not
  // re-notify the customer.
  cancelledNow: boolean;
}

// Shared cancel flow for the admin `orders.cancel` mutation and the
// customer `orders.cancelMine` mutation. `checkEligible` lets the customer
// path apply stricter rules after the replay check but before the shared
// status guards.
export const cancelOrderCore = async (
  ctx: MutationCtx,
  args: {
    requestId: string;
    orderId: Id<"orders">;
    reason: string;
    actorId: string;
    checkEligible?: (order: Doc<"orders">) => void;
  },
): Promise<OrderCancelResult> => {
  const { requestId, orderId, actorId } = args;
  if (!requestIdIsValid(requestId)) {
    throw new ConvexError("Identificator de operațiune invalid.");
  }
  const previous = await ctx.db
    .query("orderEvents")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .unique();
  if (previous) {
    if (
      previous.actorId !== actorId ||
      previous.orderId !== orderId ||
      previous.kind !== "cancelled"
    ) {
      throw new ConvexError(
        "Identificator deja utilizat pentru alta operațiune.",
      );
    }
    return { order: await ctx.db.get(orderId), cancelledNow: false };
  }
  const trimmed = args.reason.trim();
  if (trimmed.length < 3 || trimmed.length > 300) {
    throw new ConvexError(
      "Motivul anulării trebuie să aibă între 3 și 300 de caractere.",
    );
  }
  const order = await ctx.db.get(orderId);
  if (!order) throw new ConvexError("Comanda nu există.");
  args.checkEligible?.(order);
  if (order.status === "returned") {
    throw new ConvexError("Comanda returnată nu mai poate fi anulată.");
  }
  if (order.status === "shipped" || order.status === "delivered") {
    throw new ConvexError(
      "Comanda expediată nu mai poate fi anulată.",
    );
  }
  const now = Date.now();
  let eventNote = trimmed;

  if (order.status === "cancelled") {
    if (order.inventoryStatus !== "needs_review") {
      throw new ConvexError("Comanda este deja anulată.");
    }
    // Paid after cancel: release the held claims only.
    await ctx.db.patch(orderId, {
      inventoryStatus: "released",
      refundStatus: "manual_required",
      cancelReason: trimmed,
    });
    await ctx.db.insert("orderEvents", {
      orderId,
      requestId,
      actorId,
      kind: "cancelled",
      note: trimmed,
      createdAt: now,
    });
    return { order: await ctx.db.get(orderId), cancelledNow: false };
  }

  const paid = paymentStatus(order) === "paid";
  // COD orders also hold applied stock; cancel restocks but is never a refund.
  const codApplied =
    order.paymentMethod === "cod" && order.inventoryStatus === "applied";
  const notes: string[] = [];
  const patch: Record<string, unknown> = {
    status: "cancelled",
    cancelledAt: now,
    cancelledBy: actorId,
    cancelReason: trimmed,
    assignedTo: undefined,
    assignedAt: undefined,
  };
  if (paid || codApplied) {
    const applied = order.inventoryAppliedItems ?? [];
    if (applied.length > 0) {
      for (const item of applied) {
        const product = await ctx.db.get(item.productId);
        if (!product) {
          notes.push(
            `${item.name}: produsul nu mai există, stocul nu a fost restabilit.`,
          );
          continue;
        }
        const after = stockQuantity((product.stock ?? 0) + item.quantity);
        await ctx.db.patch(item.productId, { stock: after });
        await ctx.db.insert("stockMovements", {
          requestId,
          productId: item.productId,
          location: "workshop",
          kind: "online_cancel",
          quantity: item.quantity,
          balanceAfter: after,
          actorId,
          orderId,
          createdAt: now,
        });
      }
      patch.inventoryRestockedAt = now;
    } else {
      notes.push(
        "Stoc neverificat (comandă veche) — ajustează manual în Stocuri dacă e cazul.",
      );
    }
    patch.inventoryStatus = "released";
    if (paid) patch.refundStatus = "manual_required";
  }
  if (notes.length > 0) eventNote = `${trimmed} — ${notes.join(" ")}`;
  await ctx.db.patch(orderId, patch);
  await ctx.db.insert("orderEvents", {
    orderId,
    requestId,
    actorId,
    kind: "cancelled",
    note: eventNote,
    createdAt: now,
  });
  return { order: await ctx.db.get(orderId), cancelledNow: true };
};

import assert from "node:assert/strict";
import { test } from "node:test";
import { fixture } from "./helpers/convexFixture.mjs";
import * as orders from "../convex/orders.ts";
import * as fulfillment from "../convex/fulfillment.ts";
import * as pos from "../convex/pos.ts";

const admin = (db) => db.identity({ subject: "admin-1", role: "admin" });
const atelier = (db, id = "user_at") =>
  db.identity({ subject: id, role: "atelier" });
const seller = (db) => db.identity({ subject: "user_sel", role: "seller" });
const customer = (db) =>
  db.identity({ subject: "user_cust", role: "customer" });

const seedCustomer = (db, id = "cust-1", fields = {}) => {
  db.seed("customers", id, {
    clerkUserId: "user_cust",
    email: "client@exemplu.ro",
    firstName: "Prenume",
    lastName: "Nume",
    shippingAddress: {
      street: "Str. Florilor 1",
      city: "Sibiu",
      county: "SB",
      postalCode: "550001",
      country: "RO",
    },
    billingAddress: {
      street: "Str. Florilor 1",
      city: "Sibiu",
      county: "SB",
      postalCode: "550001",
      country: "RO",
    },
    newsletter: false,
    createdAt: 1,
    ...fields,
  });
};

const seedOrder = (db, id, fields = {}) => {
  db.seed("orders", id, {
    customerId: "cust-1",
    items: [
      { productId: "magnet", name: "Magnet Sibiu", price: 25, quantity: 2 },
    ],
    total: 50,
    status: "pending",
    stripeSessionId: `sess-${id}`,
    inventoryStatus: "pending",
    createdAt: Date.now(),
    ...fields,
  });
};

const markPaid = (db, id) =>
  db.run(orders.markOrderPaid, { stripeSessionId: `sess-${id}` });

const claimArgs = (orderId, n) => ({
  requestId: `req-claim-0000${n}`,
  orderId,
});

test("cancel pending order: no stock change; later Stripe payment flags needs_review; second cancel releases claims", async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedOrder(db, "o-1");
  const cancelled = await db.run(orders.cancel, {
    requestId: "cancel-00000000001",
    orderId: "o-1",
    reason: "Clientul a renunțat.",
  });
  assert.equal(cancelled.status, "cancelled");
  assert.equal(db.all("stockMovements").length, 0);
  assert.equal((await db.ctx.db.get("o-1")).inventoryStatus, "pending");

  // Late Stripe payment still lands as needs_review (existing path).
  const paid = await markPaid(db, "o-1");
  assert.equal(paid.inventoryStatus, "needs_review");
  let order = await db.ctx.db.get("o-1");
  assert.equal(order.status, "cancelled");
  assert.equal(order.inventoryReviewReason, "cancelled");
  // Claims are held.
  const overview = await db.run(pos.getStockOverview, {});
  assert.equal(
    overview.products.find((p) => p.id === "magnet").onlineHeldOrders,
    2,
  );

  // Cancelling again releases the held claims.
  await db.run(orders.cancel, {
    requestId: "cancel-00000000002",
    orderId: "o-1",
    reason: "Nu se onorează.",
  });
  order = await db.ctx.db.get("o-1");
  assert.equal(order.inventoryStatus, "released");
  assert.equal(order.refundStatus, "manual_required");
  const overview2 = await db.run(pos.getStockOverview, {});
  assert.equal(
    overview2.products.find((p) => p.id === "magnet").onlineHeldOrders,
    0,
  );
});

test("cancel paid applied order restocks once with online_cancel movement", async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedOrder(db, "o-2");
  await markPaid(db, "o-2");
  assert.equal(db.all("products")[0].stock, 98);

  const cancelled = await db.run(orders.cancel, {
    requestId: "cancel-00000000010",
    orderId: "o-2",
    reason: "Clientul a cerut anularea.",
  });
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.inventoryStatus, "released");
  assert.equal(cancelled.refundStatus, "manual_required");
  assert.ok(cancelled.inventoryRestockedAt);
  assert.equal(db.all("products")[0].stock, 100);
  const movements = db
    .all("stockMovements")
    .filter((m) => m.kind === "online_cancel");
  assert.equal(movements.length, 1);
  assert.equal(movements[0].quantity, 2);
  assert.equal(movements[0].location, "workshop");
  assert.equal(movements[0].orderId, "o-2");

  // Replay: same requestId returns without double restock.
  const again = await db.run(orders.cancel, {
    requestId: "cancel-00000000010",
    orderId: "o-2",
    reason: "Clientul a cerut anularea.",
  });
  assert.equal(again.status, "cancelled");
  assert.equal(db.all("products")[0].stock, 100);
  assert.equal(
    db.all("stockMovements").filter((m) => m.kind === "online_cancel").length,
    1,
  );

  // New requestId on already released order is rejected.
  await assert.rejects(
    db.run(orders.cancel, {
      requestId: "cancel-00000000011",
      orderId: "o-2",
      reason: "Din nou.",
    }),
    /deja anulată/,
  );
});

test("cancel shipped order rejected; legacy paid order cancels without restock", async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedOrder(db, "o-ship", { status: "shipped" });
  await assert.rejects(
    db.run(orders.cancel, {
      requestId: "cancel-00000000020",
      orderId: "o-ship",
      reason: "Prea târziu.",
    }),
    /nu mai poate fi anulată/,
  );

  seedOrder(db, "o-legacy", {
    status: "paid",
    inventoryStatus: undefined,
    inventoryAppliedItems: undefined,
  });
  const cancelled = await db.run(orders.cancel, {
    requestId: "cancel-00000000021",
    orderId: "o-legacy",
    reason: "Cerere client.",
  });
  assert.equal(cancelled.status, "cancelled");
  assert.equal(db.all("stockMovements").length, 0);
  const events = db.all("orderEvents").filter((e) => e.orderId === "o-legacy");
  assert.match(events[0].note, /Stoc neverificat/);
});

test("needs_review order is not eligible until reconciled", async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedOrder(db, "o-3", {
    items: [
      { productId: "magnet", name: "Magnet Sibiu", price: 25, quantity: 99 },
      { productId: "brad", name: "Ornament Brad", price: 30, quantity: 50 },
    ],
  });
  await db.ctx.db.patch("brad", { stock: 0 });
  const paid = await markPaid(db, "o-3");
  assert.equal(paid.inventoryStatus, "needs_review");

  atelier(db);
  await assert.rejects(
    db.run(fulfillment.claim, claimArgs("o-3", "001")),
    /nu este eligibilă/,
  );

  admin(db);
  await db.ctx.db.patch("brad", { stock: 50 });
  await db.run(orders.reconcileStock, { orderId: "o-3" });
  atelier(db);
  const claimed = await db.run(fulfillment.claim, claimArgs("o-3", "002"));
  assert.equal(claimed.fulfillmentStatus, "preparing");
  assert.equal(claimed.assignedTo, "user_at");
});

test("concurrent claim rejected; release frees it; admin reassign records event", async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedOrder(db, "o-4");
  await markPaid(db, "o-4");

  atelier(db, "user_a");
  await db.run(fulfillment.claim, claimArgs("o-4", "a01"));
  atelier(db, "user_b");
  await assert.rejects(
    db.run(fulfillment.claim, claimArgs("o-4", "b01")),
    /alt operator/,
  );

  atelier(db, "user_a");
  await db.run(fulfillment.release, {
    requestId: "req-rel-0000000001",
    orderId: "o-4",
  });
  atelier(db, "user_b");
  const reclaimed = await db.run(fulfillment.claim, claimArgs("o-4", "b02"));
  assert.equal(reclaimed.assignedTo, "user_b");

  admin(db);
  await db.run(fulfillment.reassign, {
    requestId: "req-rea-0000000001",
    orderId: "o-4",
    userId: "user_c",
  });
  const order = await db.ctx.db.get("o-4");
  assert.equal(order.assignedTo, "user_c");
  const event = db.all("orderEvents").find((e) => e.kind === "reassigned");
  assert.equal(event.data.fromUser, "user_b");
  assert.equal(event.data.toUser, "user_c");
});

test("pending order is never eligible or queued; updateStatus cannot set payment status", async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedOrder(db, "o-5");
  atelier(db);
  await assert.rejects(
    db.run(fulfillment.claim, claimArgs("o-5", "001")),
    /nu este eligibilă/,
  );
  const queue = await db.run(fulfillment.queue, {});
  assert.equal(
    queue.some((row) => row._id === "o-5"),
    false,
  );
  await assert.rejects(
    db.run(orders.updateStatus, { orderId: "o-5", status: "paid" }),
    /acțiunile dedicate/,
  );
  await assert.rejects(
    db.run(orders.updateStatus, { orderId: "o-5", status: "pending" }),
    /acțiunile dedicate/,
  );
});

test("full fulfillment flow: claim, checklist, pack, ship, delivered", async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedOrder(db, "o-6");
  await markPaid(db, "o-6");

  atelier(db, "user_a");
  // Pack before claim → rejected.
  await assert.rejects(
    db.run(fulfillment.markPacked, {
      requestId: "req-pack-00000001",
      orderId: "o-6",
    }),
  );
  const claimed = await db.run(fulfillment.claim, claimArgs("o-6", "a01"));
  assert.equal(claimed.fulfillmentStatus, "preparing");
  assert.equal(claimed.checklist.length, 1);
  assert.equal(claimed.checklist[0].checked, false);

  // Not all checked → pack rejected.
  await assert.rejects(
    db.run(fulfillment.markPacked, {
      requestId: "req-pack-00000002",
      orderId: "o-6",
    }),
    /Bifează toate produsele/,
  );

  // Non-assignee atelier cannot check.
  atelier(db, "user_b");
  await assert.rejects(
    db.run(fulfillment.setChecked, {
      requestId: "req-check-0000001",
      orderId: "o-6",
      productId: "magnet",
      checked: true,
    }),
    /Doar operatorul/,
  );

  atelier(db, "user_a");
  const checked = await db.run(fulfillment.setChecked, {
    requestId: "req-check-0000002",
    orderId: "o-6",
    productId: "magnet",
    checked: true,
  });
  assert.equal(checked.checklist[0].checked, true);

  const packed = await db.run(fulfillment.markPacked, {
    requestId: "req-pack-00000003",
    orderId: "o-6",
  });
  assert.equal(packed.fulfillmentStatus, "packed");
  assert.ok(packed.packedAt);

  // Invalid AWB rejected.
  await assert.rejects(
    db.run(fulfillment.ship, {
      requestId: "req-ship-00000001",
      orderId: "o-6",
      awb: "x!",
    }),
    /AWB/,
  );
  const shipped = await db.run(fulfillment.ship, {
    requestId: "req-ship-00000002",
    orderId: "o-6",
    awb: "AWB-12345",
    carrier: "FAN Courier",
  });
  assert.equal(shipped.status, "shipped");
  assert.equal(shipped.awb, "AWB-12345");
  assert.equal(shipped.shippedBy, "user_a");

  const delivered = await db.run(fulfillment.markDelivered, {
    requestId: "req-dlv-0000000001",
    orderId: "o-6",
  });
  assert.equal(delivered.status, "delivered");
  assert.ok(delivered.deliveredAt);
});

test("ship from preparing is rejected", async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedOrder(db, "o-7");
  await markPaid(db, "o-7");
  atelier(db);
  await db.run(fulfillment.claim, claimArgs("o-7", "001"));
  await assert.rejects(
    db.run(fulfillment.ship, {
      requestId: "req-ship-00000003",
      orderId: "o-7",
    }),
    /nu este ambalată/,
  );
});

test("access control: roles denied/allowed correctly", async () => {
  const db = fixture();
  seedCustomer(db);
  seedOrder(db, "o-8");
  admin(db);
  await markPaid(db, "o-8");

  for (const make of [seller, customer]) {
    const db2 = fixture();
    seedCustomer(db2);
    seedOrder(db2, "o-9");
    make(db2);
    await assert.rejects(db2.run(fulfillment.queue, {}));
    await assert.rejects(db2.run(fulfillment.get, { orderId: "o-9" }));
    await assert.rejects(db2.run(fulfillment.claim, claimArgs("o-9", "x")));
    await assert.rejects(db2.run(orders.listAdmin, {}));
    await assert.rejects(db2.run(orders.getAdmin, { orderId: "o-9" }));
    await assert.rejects(
      db2.run(orders.cancel, {
        requestId: "cancel-00000000030",
        orderId: "o-9",
        reason: "Nu.",
      }),
    );
  }

  // Atelier: fulfillment allowed, admin queries denied.
  atelier(db, "user_at");
  const queue = await db.run(fulfillment.queue, {});
  assert.equal(queue.length, 1);
  assert.equal(queue[0].state, "ready");
  assert.equal(queue[0].assignedToMe, false);
  await assert.rejects(db.run(orders.listAdmin, {}));
  await assert.rejects(db.run(orders.getAdmin, { orderId: "o-8" }));
  await assert.rejects(
    db.run(orders.cancel, {
      requestId: "cancel-00000000040",
      orderId: "o-8",
      reason: "Nu.",
    }),
  );
  await assert.rejects(
    db.run(fulfillment.reassign, {
      requestId: "req-rea-0000000002",
      orderId: "o-8",
      userId: "user_c",
    }),
  );

  // Atelier get view keeps customer PII and money redacted (email, Stripe
  // session, prices, total); order managers still see prices because the
  // packing slip printed for the parcel needs them.
  await db.run(fulfillment.claim, claimArgs("o-8", "x1"));
  const detail = await db.run(fulfillment.get, { orderId: "o-8" });
  assert.equal(detail.recipient.firstName, "Prenume");
  assert.equal(detail.recipient.address.city, "Sibiu");
  const serialized = JSON.stringify(detail);
  assert.equal(serialized.includes("client@exemplu.ro"), false);
  assert.equal(serialized.includes("sess-o-8"), false);
  assert.equal(serialized.includes('"price"'), false);
  assert.equal("total" in detail, false);
  admin(db);
  const adminDetail = await db.run(fulfillment.get, { orderId: "o-8" });
  assert.equal(adminDetail.items[0].price, 25);
  assert.equal(adminDetail.total, 50);
});

test("requestId replay: same request returns order, different action rejected", async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedOrder(db, "o-10");
  await markPaid(db, "o-10");
  atelier(db, "user_a");
  const first = await db.run(fulfillment.claim, claimArgs("o-10", "r1"));
  const replayed = await db.run(fulfillment.claim, claimArgs("o-10", "r1"));
  assert.equal(replayed.assignedTo, first.assignedTo);
  assert.equal(
    db.all("orderEvents").filter((e) => e.kind === "claimed").length,
    1,
  );
  // Same requestId, different kind.
  await assert.rejects(
    db.run(fulfillment.markPacked, {
      requestId: "req-claim-0000r1",
      orderId: "o-10",
    }),
    /alta operațiune/,
  );
  // Same requestId, different order.
  seedOrder(db, "o-11");
  await markPaid(db, "o-11");
  await assert.rejects(
    db.run(fulfillment.claim, {
      requestId: "req-claim-0000r1",
      orderId: "o-11",
    }),
    /alta operațiune/,
  );
});

test("createPendingOrder stores shipping snapshot and markOrderPaid stays idempotent", async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  const orderId = await db.run(orders.createPendingOrder, {
    customerId: "cust-1",
    items: [
      { productId: "magnet", name: "Magnet Sibiu", price: 25, quantity: 1 },
    ],
    total: 25,
    stripeSessionId: "sess-new",
    shipping: {
      firstName: "Ion",
      lastName: "Pop",
      address: {
        street: "Aleea 1",
        city: "Cluj",
        county: "CJ",
        postalCode: "400001",
        country: "RO",
      },
    },
  });
  const order = await db.ctx.db.get(orderId);
  assert.equal(order.shipping.firstName, "Ion");
  assert.equal(order.shipping.address.city, "Cluj");
  const detailAdmin = await db.run(orders.getAdmin, { orderId });
  assert.equal(detailAdmin.shipping.address.city, "Cluj");

  // Snapshot-less order falls back to the customer record.
  seedOrder(db, "o-legacy-ship", {
    status: "paid",
    inventoryStatus: undefined,
  });
  const legacyDetail = await db.run(orders.getAdmin, {
    orderId: "o-legacy-ship",
  });
  assert.equal(legacyDetail.shipping.address.city, "Sibiu");
  assert.equal(legacyDetail.shippingSource, "customer");

  // markOrderPaid still deducts once and is idempotent.
  const paid = await db.run(orders.markOrderPaid, {
    stripeSessionId: "sess-new",
  });
  assert.equal(paid.inventoryStatus, "applied");
  assert.equal(db.all("products")[0].stock, 99);
  await db.run(orders.markOrderPaid, { stripeSessionId: "sess-new" });
  assert.equal(db.all("products")[0].stock, 99);

  // POS sale (prepare + complete) creates no order and nothing in the queue.
  const orderCount = db.all("orders").length;
  const posArgs = {
    requestId: "request-pos-check-0001",
    fairId: "fair-1",
    paymentMethod: "cash",
    discountCents: 0,
    discountReason: "",
    items: [{ productId: "stea", quantity: 1, expectedUnitPriceCents: 2000 }],
  };
  await db.run(pos.prepare, posArgs);
  await db.run(pos.complete, {
    requestId: posArgs.requestId,
    receivedCents: 2000,
  });
  assert.equal(db.all("orders").length, orderCount);
  const queue = await db.run(fulfillment.queue, {});
  assert.equal(queue.length, 2); // only the two seeded orders, not the POS sale

  // getMyOrders unchanged for the owner.
  db.identity({ subject: "user_cust", role: "customer" });
  const mine = await db.run(orders.getMyOrders, {});
  assert.equal(mine.length, 2);
});

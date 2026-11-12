import assert from "node:assert/strict";
import { test } from "node:test";

import { generateShippedEmailHtml } from "../convex/lib/orderEmails.utils.ts";

const order = (overrides = {}) => ({
  _id: "orderid0000shipped01",
  _creationTime: 1,
  items: [
    { productId: "magnet", name: "Magnet Sibiu", price: 25, quantity: 2 },
    { productId: "brad", name: "Ornament Brad", price: 30, quantity: 1 },
  ],
  total: 80,
  paymentMethod: "card",
  paymentConfirmedAt: 1,
  shippedAt: Date.UTC(2026, 0, 15, 12),
  awb: "AWB-12345",
  carrier: "FAN Courier",
  shipping: {
    firstName: "Ion",
    lastName: "Popescu",
    phone: "0700000000",
    address: {
      street: "Str. Florilor 1",
      city: "Sibiu",
      county: "SB",
      postalCode: "550001",
      country: "RO",
    },
  },
  customer: {
    email: "client@exemplu.ro",
    firstName: "Ion",
    lastName: "Popescu",
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
  },
  ...overrides,
});

test("shipped email shows AWB, carrier and the tracking link", () => {
  const html = generateShippedEmailHtml(order(), false);
  assert.ok(html.includes("Comanda ta este pe drum"));
  assert.ok(html.includes("AWB-12345"));
  assert.ok(html.includes("FAN Courier"));
  assert.ok(
    html.includes(
      'href="https://www.fancourier.ro/awb-tracking/?tracking=AWB-12345"',
    ),
  );
  assert.ok(html.includes("Urmărește coletul"));
  assert.ok(html.includes("Statusul apare pe site-ul curierului"));
});

test("shipped email lists products without prices", () => {
  const html = generateShippedEmailHtml(order(), false);
  assert.ok(html.includes("Magnet Sibiu"));
  assert.ok(html.includes("Ornament Brad"));
  assert.ok(!html.includes("25.00 RON"));
  assert.ok(!html.includes("30.00 RON"));
  assert.ok(!html.includes("80.00 RON"));
});

test("shipped email shows the COD notice only for ramburs orders", () => {
  const cod = generateShippedEmailHtml(
    order({ paymentMethod: "cod", total: 80 }),
    false,
  );
  assert.ok(cod.includes("Plată la livrare: 80.00 RON"));
  const card = generateShippedEmailHtml(order(), false);
  assert.ok(!card.includes("Plată la livrare"));
});

test("shipped email without a known carrier hides the button", () => {
  const html = generateShippedEmailHtml(
    order({ carrier: "Curier Local" }),
    false,
  );
  assert.ok(!html.includes("Urmărește coletul"));
  assert.ok(
    html.includes(
      "Folosește numărul AWB pe site-ul curierului pentru a urmări coletul.",
    ),
  );
});

test("shipped email escapes dynamic values", () => {
  const html = generateShippedEmailHtml(
    order({
      items: [
        {
          productId: "magnet",
          name: '<img src=x onerror="alert(1)">',
          price: 25,
          quantity: 1,
        },
      ],
      carrier: '<b>FAN Courier</b>',
    }),
    false,
  );
  assert.ok(!html.includes('<img src=x onerror="alert(1)">'));
  assert.ok(html.includes("&lt;img src=x"));
  assert.ok(!html.includes("<b>FAN Courier</b>"));
});

test("shipped email shows the TEST banner only in test mode", () => {
  assert.ok(generateShippedEmailHtml(order(), true).includes("Mediu TEST"));
  assert.ok(!generateShippedEmailHtml(order(), false).includes("Mediu TEST"));
});

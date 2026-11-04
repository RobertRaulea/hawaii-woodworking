import assert from 'node:assert/strict';
import { test } from 'node:test';
import { customerSpend } from '../convex/lib/orders.utils.ts';
import { getAll } from '../convex/customers.ts';
import { fixture } from './helpers/convexFixture.mjs';

const cases = [
  { status: 'pending', inventoryStatus: 'pending', total: 100 },
  { status: 'paid', inventoryStatus: 'applied', paymentConfirmedAt: 1, total: 0.1 },
  { status: 'paid', inventoryStatus: 'needs_review', paymentConfirmedAt: 1, total: 0.2 },
  { status: 'paid', inventoryStatus: 'applied', total: 200 },
  { status: 'paid', total: 30 },
  { status: 'shipped', total: 40 },
  { status: 'delivered', total: 50 },
  { status: 'cancelled', paymentConfirmedAt: 1, total: 300 },
  { status: 'cancelled', total: 400 },
];

test('customer spending counts confirmed/legacy paid orders in cents, never pending or cancelled orders', () => {
  assert.equal(customerSpend(cases), 120.3);
  assert.equal(customerSpend([]), 0);
  const independentCents = [10, 20, 3000, 4000, 5000].reduce((sum, value) => sum + value, 0);
  assert.equal(customerSpend(cases) * 100, independentCents);
});

test('the admin customer list uses the same confirmed spending definition and retains authorization', async () => {
  const db = fixture();
  db.seed('customers', 'spend-customer', { email: 'fixture@example.invalid', createdAt: 1 });
  cases.forEach((row, index) => db.seed('orders', `spend-order-${index}`, {
    ...row, customerId: 'spend-customer', items: [], createdAt: index,
    stripeSessionId: `fixture-session-${index}`,
  }));
  const [customer] = await db.run(getAll);
  assert.equal(customer.totalSpent, 120.3);
  assert.equal(customer.orderCount, cases.length);
  db.identity({ subject: 'seller-fixture', role: 'seller' });
  await assert.rejects(() => db.run(getAll), /Forbidden/);
});

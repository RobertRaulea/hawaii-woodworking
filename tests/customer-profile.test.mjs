import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from './helpers/convexFixture.mjs';
import {
  syncMyProfile,
  upsertFromShipping,
  updateCustomer,
} from '../convex/customers.ts';

const address = {
  street: 'Str. Test 1',
  city: 'Sibiu',
  county: 'Sibiu',
  postalCode: '550000',
  country: 'România',
};
const profile = {
  email: 'buyer@example.test',
  phone: '+40712345678',
  firstName: 'Buyer',
  lastName: 'Example',
  shippingAddress: address,
  billingAddress: address,
  newsletter: false,
};
const guestRow = { ...profile, isRegistered: false, createdAt: 1 };

test('syncMyProfile links a guest row by verified email and marks it registered', async () => {
  const db = fixture();
  db.seed('customers', 'customer-1', { ...guestRow });
  db.identity({ subject: 'user-1', email: 'Buyer@example.test', emailVerified: true });
  const linked = await db.run(syncMyProfile);
  assert.equal(linked._id, 'customer-1');
  const row = await db.ctx.db.get('customer-1');
  assert.equal(row.clerkUserId, 'user-1');
  assert.equal(row.isRegistered, true);
});

test('syncMyProfile falls back to the raw stored email casing', async () => {
  const db = fixture();
  db.seed('customers', 'customer-1', { ...guestRow, email: 'Mixed@example.test' });
  db.identity({ subject: 'user-1', email: 'Mixed@example.test', emailVerified: true });
  const linked = await db.run(syncMyProfile);
  assert.equal(linked._id, 'customer-1');
});

test('syncMyProfile returns the already-linked row without touching it', async () => {
  const db = fixture();
  db.seed('customers', 'customer-1', {
    ...guestRow,
    clerkUserId: 'user-1',
    isRegistered: true,
  });
  db.seed('customers', 'customer-2', {
    ...guestRow,
    email: 'other@example.test',
    clerkUserId: 'user-2',
  });
  db.identity({ subject: 'user-1', email: 'Buyer@example.test', emailVerified: true });
  const linked = await db.run(syncMyProfile);
  assert.equal(linked._id, 'customer-1');
  assert.equal((await db.ctx.db.get('customer-2')).clerkUserId, 'user-2');
});

test('syncMyProfile does not link when the email is not verified', async () => {
  const db = fixture();
  db.seed('customers', 'customer-1', { ...guestRow });
  db.identity({ subject: 'user-1', email: 'buyer@example.test', emailVerified: false });
  assert.equal(await db.run(syncMyProfile), null);
  assert.equal((await db.ctx.db.get('customer-1')).clerkUserId, undefined);
});

test('syncMyProfile never steals a row linked to a different account', async () => {
  const db = fixture();
  db.seed('customers', 'customer-1', { ...guestRow, clerkUserId: 'user-2' });
  db.identity({ subject: 'user-1', email: 'buyer@example.test', emailVerified: true });
  assert.equal(await db.run(syncMyProfile), null);
  const row = await db.ctx.db.get('customer-1');
  assert.equal(row.clerkUserId, 'user-2');
  assert.equal(row.isRegistered, false);
});

test('syncMyProfile is idempotent and needs an identity', async () => {
  const db = fixture();
  db.seed('customers', 'customer-1', { ...guestRow });
  db.identity({ subject: 'user-1', email: 'buyer@example.test', emailVerified: true });
  await db.run(syncMyProfile);
  const second = await db.run(syncMyProfile);
  assert.equal(second._id, 'customer-1');
  assert.equal((await db.ctx.db.get('customer-1')).clerkUserId, 'user-1');
  db.identity(null);
  assert.equal(await db.run(syncMyProfile), null);
});

test('shipping upsert stamps, keeps, then clears newsletterConsentAt', async () => {
  const db = fixture();
  db.identity(null);
  const id = await db.run(upsertFromShipping, { ...profile, newsletter: true });
  const stamped = (await db.ctx.db.get(id)).newsletterConsentAt;
  assert.equal(typeof stamped, 'number');
  await db.run(upsertFromShipping, { ...profile, newsletter: true });
  assert.equal((await db.ctx.db.get(id)).newsletterConsentAt, stamped);
  await db.run(upsertFromShipping, { ...profile, newsletter: false });
  assert.equal((await db.ctx.db.get(id)).newsletterConsentAt, undefined);
  await db.run(upsertFromShipping, { ...profile, newsletter: true });
  assert.equal(typeof (await db.ctx.db.get(id)).newsletterConsentAt, 'number');
});

test('admin updateCustomer follows the same consent transitions', async () => {
  const db = fixture();
  db.seed('customers', 'customer-1', { ...guestRow });
  await db.run(updateCustomer, { customerId: 'customer-1', ...profile, newsletter: true });
  const stamped = (await db.ctx.db.get('customer-1')).newsletterConsentAt;
  assert.equal(typeof stamped, 'number');
  await db.run(updateCustomer, { customerId: 'customer-1', ...profile, newsletter: true });
  assert.equal((await db.ctx.db.get('customer-1')).newsletterConsentAt, stamped);
  await db.run(updateCustomer, { customerId: 'customer-1', ...profile, newsletter: false });
  assert.equal((await db.ctx.db.get('customer-1')).newsletterConsentAt, undefined);
});

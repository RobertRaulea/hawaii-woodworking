import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as pos from '../convex/pos.ts';
import * as orders from '../convex/orders.ts';
import * as fulfillment from '../convex/fulfillment.ts';
import * as customers from '../convex/customers.ts';
import * as products from '../convex/products.ts';
import * as categories from '../convex/categories.ts';
import * as seedModule from '../convex/seedCategories.ts';
import * as staff from '../convex/staff.ts';
import * as transfers from '../convex/transfers.ts';
import {
  parseRole,
  permissionsFor,
  hasPermission,
} from '../convex/lib/permissions.ts';
import { fixture } from './helpers/convexFixture.mjs';

const DENIED = /Unauthorized|Forbidden|acces/i;

const seedCustomer = (db, id, fields = {}) => {
  const address = {
    street: 'Str. Exemplu 1',
    city: 'Sibiu',
    county: 'Sibiu',
    postalCode: '550000',
    country: 'România',
  };
  db.seed('customers', id, {
    email: `${id}@exemplu.ro`,
    firstName: 'Prenume',
    lastName: 'Nume',
    shippingAddress: address,
    billingAddress: address,
    newsletter: false,
    createdAt: 1,
    ...fields,
  });
};

const seedOrder = (db, id, fields = {}) => {
  db.seed('orders', id, {
    customerId: 'cust-1',
    items: [
      { productId: 'magnet', name: 'Magnet Sibiu', price: 25, quantity: 2 },
    ],
    total: 50,
    status: 'paid',
    stripeSessionId: `sess-${id}`,
    inventoryStatus: 'applied',
    createdAt: Date.now(),
    ...fields,
  });
};

const assignSeller = (db, fairId, userId) =>
  db.seed('fairAssignments', `asg-${fairId}-${userId}`, {
    fairId,
    userId,
    assignedBy: 'admin-1',
    createdAt: 1,
  });

const prepareArgs = (requestId, fairId = 'fair-1') => ({
  requestId,
  fairId,
  paymentMethod: 'cash',
  discountCents: 0,
  discountReason: '',
  items: [{ productId: 'magnet', quantity: 2, expectedUnitPriceCents: 2500 }],
});

const shippingProfile = (email) => ({
  email,
  firstName: 'Ion',
  lastName: 'Popescu',
  shippingAddress: {
    street: 'Str. Nouă 2',
    city: 'Cluj',
    county: 'Cluj',
    postalCode: '400000',
    country: 'România',
  },
  billingAddress: {
    street: 'Str. Nouă 2',
    city: 'Cluj',
    county: 'Cluj',
    postalCode: '400000',
    country: 'România',
  },
  newsletter: false,
});

test('parseRole accepts only the exact staff role strings', () => {
  for (const role of ['admin', 'seller', 'atelier'])
    assert.equal(parseRole(role), role);
  for (const value of [
    undefined,
    '',
    'ADMIN',
    'VANZATOR',
    'customer',
    ['admin'],
    { role: 'admin' },
    null,
    1,
  ])
    assert.equal(parseRole(value), null);
  assert.equal(hasPermission(null, 'pos.sell'), false);
  assert.deepEqual(permissionsFor(null), []);
  assert.ok(permissionsFor('admin').length > 0);
});

test('permission matrix across identities and guarded functions', async () => {
  const identities = {
    anonymous: null,
    customer: { subject: 'user_cust', role: 'customer' },
    unknown: { subject: 'user_unk', role: 'unknown' },
    seller: { subject: 'user_sel', role: 'seller' },
    atelier: { subject: 'user_at', role: 'atelier' },
    admin: { subject: 'user_adm', role: 'admin' },
  };
  const cases = [
    ['pos.listFairs', pos.listFairs, () => ({}), ['seller', 'atelier', 'admin']],
    ['pos.workspace', pos.workspace, () => ({ fairId: 'fair-1' }), ['admin']],
    [
      'pos.prepare',
      pos.prepare,
      () => prepareArgs('req-matrix-00000001'),
      ['admin'],
    ],
    [
      'transfers.request',
      transfers.request,
      (db) => {
        assignSeller(db, 'fair-1', 'user_sel');
        return {
          requestId: 'req-matrix-00000002',
          toFairId: 'fair-1',
          lines: [{ productId: 'magnet', quantity: 1 }],
        };
      },
      ['seller', 'admin'],
    ],
    [
      'transfers.create',
      transfers.create,
      () => ({
        requestId: 'req-matrix-00000006',
        from: { location: 'workshop' },
        to: { location: 'fair', fairId: 'fair-1' },
        lines: [{ productId: 'magnet', quantity: 1 }],
      }),
      ['atelier', 'admin'],
    ],
    [
      'transfers.ship',
      transfers.ship,
      (db) => {
        db.seed('transfers', 'tr-matrix-ship', {
          status: 'draft',
          createdBy: 'user_adm',
          createdAt: 1,
          updatedAt: 1,
          fromLocation: 'workshop',
          toLocation: 'fair',
          toFairId: 'fair-1',
          lines: [
            {
              productId: 'magnet',
              productName: 'Magnet Sibiu',
              quantity: 1,
              shippedQuantity: 0,
              receivedQuantity: 0,
            },
          ],
        });
        return {
          requestId: 'req-matrix-00000007',
          transferId: 'tr-matrix-ship',
        };
      },
      ['atelier', 'admin'],
    ],
    [
      'transfers.receive',
      transfers.receive,
      (db) => {
        db.seed('transfers', 'tr-matrix-recv', {
          status: 'in_transit',
          createdBy: 'user_adm',
          createdAt: 1,
          updatedAt: 1,
          fromLocation: 'workshop',
          toLocation: 'fair',
          toFairId: 'fair-1',
          lines: [
            {
              productId: 'magnet',
              productName: 'Magnet Sibiu',
              quantity: 1,
              shippedQuantity: 1,
              receivedQuantity: 0,
            },
          ],
        });
        return {
          requestId: 'req-matrix-00000008',
          transferId: 'tr-matrix-recv',
          lines: [{ productId: 'magnet', quantity: 1 }],
        };
      },
      ['atelier', 'admin'],
    ],
    [
      'pos.setProductOptions',
      pos.setProductOptions,
      () => ({ productId: 'magnet', sku: '', favorite: false }),
      ['atelier', 'admin'],
    ],
    [
      'pos.getStockOverview',
      pos.getStockOverview,
      () => ({}),
      ['seller', 'atelier', 'admin'],
    ],
    [
      'pos.createFair',
      pos.createFair,
      () => ({ name: 'Târg nou' }),
      ['admin'],
    ],
    [
      'pos.archiveFair',
      pos.archiveFair,
      () => ({
        requestId: 'req-matrix-00000003',
        fairId: 'fair-1',
        expectedInventory: [
          { productId: 'magnet', quantity: 34 },
          { productId: 'brad', quantity: 28 },
          { productId: 'stea', quantity: 16 },
        ],
      }),
      ['admin'],
    ],
    [
      'staff.assignFairSeller',
      staff.assignFairSeller,
      () => ({ fairId: 'fair-1', userId: 'user_abc' }),
      ['admin'],
    ],
    ['orders.getAll', orders.getAll, () => ({}), ['atelier', 'admin']],
    [
      'orders.updateStatus',
      orders.updateStatus,
      (db) => {
        seedOrder(db, 'matrix-order', { status: 'shipped', inventoryStatus: 'applied' });
        return { orderId: 'matrix-order', status: 'delivered' };
      },
      ['atelier', 'admin'],
    ],
    [
      'orders.reconcileStock',
      orders.reconcileStock,
      (db) => {
        seedOrder(db, 'matrix-order', { inventoryStatus: 'applied' });
        return { orderId: 'matrix-order' };
      },
      ['atelier', 'admin'],
    ],
    [
      'orders.getByCustomerId',
      orders.getByCustomerId,
      () => ({ customerId: 'cust-1' }),
      ['admin'],
    ],
    ['customers.getAll', customers.getAll, () => ({}), ['admin']],
    [
      'products.updateProduct',
      products.updateProduct,
      () => ({ id: 'magnet', price: 30 }),
      ['admin'],
    ],
    [
      'categories.create',
      categories.create,
      () => ({ name: 'Nouă categorie' }),
      ['admin'],
    ],
    [
      'seedCategories.seedCategories',
      seedModule.seedCategories,
      () => ({ force: false }),
      ['admin'],
    ],
  ];
  for (const [name, fn, buildArgs, allowed] of cases) {
    for (const [identityName, identity] of Object.entries(identities)) {
      const db = fixture();
      db.identity(identity);
      const args = buildArgs(db);
      if (allowed.includes(identityName)) {
        await db.run(fn, args);
      } else {
        await assert.rejects(
          db.run(fn, args),
          DENIED,
          `${name} should deny ${identityName}`,
        );
      }
    }
  }
});

test('seller access is limited to assigned fairs', async () => {
  const db = fixture();
  db.seed('fairs', 'fair-2', {
    name: 'Târg Paști',
    active: true,
    createdBy: 'admin-1',
  });
  db.seed('fairInventory', 'balance-fair-2', {
    fairId: 'fair-2',
    productId: 'magnet',
    quantity: 5,
  });
  assignSeller(db, 'fair-1', 'user_sel');
  db.identity({ subject: 'user_sel', role: 'seller' });

  await assert.rejects(
    db.run(pos.workspace, { fairId: 'fair-2' }),
    /acest târg/i,
  );
  await assert.rejects(
    db.run(pos.prepare, prepareArgs('req-loc-0000000001', 'fair-2')),
    /acest târg/i,
  );
  await assert.rejects(
    db.run(pos.dailySummary, { fairId: 'fair-2', date: '2026-10-22' }),
    /acest târg/i,
  );

  const fairs = await db.run(pos.listFairs, { includeArchived: true });
  assert.deepEqual(
    fairs.map((fair) => fair._id),
    ['fair-1'],
  );

  const overview = await db.run(pos.getStockOverview, {});
  assert.equal(overview.scope, 'assigned');
  assert.deepEqual(
    overview.fairs.map((fair) => fair._id),
    ['fair-1'],
  );
  assert.deepEqual(overview.issues, []);
  const magnet = overview.products.find((product) => product.id === 'magnet');
  assert.equal(magnet.onlineStock, null);
  assert.equal(magnet.onlinePhysicalStock, null);
  assert.equal(magnet.onlineHeldOrders, null);
  assert.equal(magnet.totalStock, null);
  assert.equal(magnet.fairsStock, 34);
  assert.deepEqual(
    magnet.fairs.map((row) => row.fairId),
    ['fair-1'],
  );

  // Unassignment blocks new attempts but never strands a prepared payment.
  const args = prepareArgs('req-loc-0000000002');
  await db.run(pos.prepare, args);
  db.identity({ subject: 'user_adm', role: 'admin' });
  await db.run(staff.unassignFairSeller, {
    fairId: 'fair-1',
    userId: 'user_sel',
  });
  db.identity({ subject: 'user_sel', role: 'seller' });
  await assert.rejects(
    db.run(pos.prepare, prepareArgs('req-loc-0000000003')),
    /acest târg/i,
  );
  const completed = await db.run(pos.complete, {
    requestId: args.requestId,
    receivedCents: 5000,
  });
  assert.equal(completed.totalCents, 5000);
  assert.equal(db.all('posSales').length, 1);
});

test('role claims cannot be escalated via metadata', async () => {
  // unsafeMetadata is never consulted.
  let db = fixture();
  db.identity({ subject: 'user_x', unsafeMetadata: { role: 'admin' } });
  await assert.rejects(db.run(customers.getAll, {}), DENIED);

  // The top-level role claim wins over publicMetadata.
  db = fixture();
  db.identity({ subject: 'user_x', role: 'seller', publicMetadata: { role: 'admin' } });
  await assert.rejects(db.run(customers.getAll, {}), DENIED);
  assert.ok(Array.isArray(await db.run(pos.listFairs, {})));

  // A seller cannot assign itself to a fair.
  db.identity({ subject: 'user_sel', role: 'seller' });
  await assert.rejects(
    db.run(staff.assignFairSeller, { fairId: 'fair-1', userId: 'user_sel' }),
    DENIED,
  );

  // getByClerkUserId only ever returns the caller's own record.
  db = fixture();
  seedCustomer(db, 'cust-a', { clerkUserId: 'user_a', email: 'a@exemplu.ro' });
  seedCustomer(db, 'cust-b', { clerkUserId: 'user_b', email: 'b@exemplu.ro' });
  db.identity({ subject: 'user_b', role: 'customer' });
  const own = await db.run(customers.getByClerkUserId, {});
  assert.equal(own.email, 'b@exemplu.ro');
  db.identity({ subject: 'user_c', role: 'customer' });
  assert.equal(await db.run(customers.getByClerkUserId, {}), null);
});

test('customer linking follows the verified caller, not client ids', async () => {
  // A signed-in user cannot overwrite a record linked to another account.
  let db = fixture();
  seedCustomer(db, 'cust-a', { clerkUserId: 'user_a', email: 'a@exemplu.ro' });
  db.identity({ subject: 'user_b', email: 'b@exemplu.ro', emailVerified: true });
  await assert.rejects(
    db.run(customers.upsertFromShipping, shippingProfile('a@exemplu.ro')),
    /aparține unui cont existent/i,
  );
  assert.equal(db.all('customers')[0].firstName, 'Prenume');
  assert.equal(db.all('customers')[0].clerkUserId, 'user_a');

  // An unverified email never links an unlinked record.
  db = fixture();
  seedCustomer(db, 'cust-b', { email: 'b@exemplu.ro' });
  db.identity({ subject: 'user_b', email: 'b@exemplu.ro', emailVerified: false });
  await db.run(customers.upsertFromShipping, shippingProfile('b@exemplu.ro'));
  assert.equal(db.all('customers')[0].clerkUserId, undefined);
  assert.equal(db.all('customers')[0].firstName, 'Ion');

  // A verified matching email links the record.
  db.identity({ subject: 'user_b', email: 'B@exemplu.ro', emailVerified: true });
  await db.run(customers.upsertFromShipping, shippingProfile('b@exemplu.ro'));
  assert.equal(db.all('customers')[0].clerkUserId, 'user_b');
});

test('atelier sees a redacted fulfillable order view', async () => {
  const db = fixture();
  seedCustomer(db, 'cust-1', { email: 'client@exemplu.ro' });
  seedOrder(db, 'o-pending', { status: 'pending' });
  seedOrder(db, 'o-paid', { status: 'paid', paymentConfirmedAt: 1 });
  seedOrder(db, 'o-shipped', { status: 'shipped' });
  seedOrder(db, 'o-cancelled', { status: 'cancelled' });
  db.identity({ subject: 'user_at', role: 'atelier' });

  const list = await db.run(orders.getAll, {});
  assert.deepEqual(
    list.map((order) => order._id).sort(),
    ['o-paid', 'o-shipped'],
  );
  for (const order of list) {
    assert.equal(order.total, null);
    assert.equal(order.stripeSessionId, null);
    assert.equal(order.stripePaymentIntentId, undefined);
    assert.equal(order.invoiceId, undefined);
    assert.equal(order.invoicePdfUrl, undefined);
    assert.equal(order.postPaymentScheduledAt, undefined);
    assert.equal(order.items[0].price, null);
    assert.equal(order.customer.email, null);
    assert.equal(order.customer.firstName, 'Prenume');
  }

  assert.equal(await db.run(orders.getById, { orderId: 'o-pending' }), null);
  const detail = await db.run(orders.getById, { orderId: 'o-paid' });
  assert.equal(detail.customer.email, null);
  assert.equal(detail.customer.billingAddress, null);
  assert.equal(detail.customer._id, 'cust-1');
  assert.equal(detail.customer.shippingAddress.city, 'Sibiu');

  await db.run(fulfillment.claim, {
    requestId: 'req-claim-auth-0001',
    orderId: 'o-paid',
  });
  await db.run(fulfillment.setChecked, {
    requestId: 'req-check-auth-0001',
    orderId: 'o-paid',
    productId: 'magnet',
    checked: true,
  });
  await db.run(fulfillment.markPacked, {
    requestId: 'req-pack-auth-00001',
    orderId: 'o-paid',
  });
  await db.run(fulfillment.ship, {
    requestId: 'req-ship-auth-00001',
    orderId: 'o-paid',
  });
  await db.run(orders.updateStatus, {
    orderId: 'o-shipped',
    status: 'delivered',
  });
  seedOrder(db, 'o-paid2', { status: 'paid' });
  await assert.rejects(
    db.run(orders.updateStatus, { orderId: 'o-paid2', status: 'cancelled' }),
    /acțiunile dedicate/i,
  );
  await assert.rejects(
    db.run(orders.updateStatus, { orderId: 'o-pending', status: 'shipped' }),
    /acțiunile dedicate/i,
  );
});

test('staff directory records actors and resolves emails', async () => {
  const db = fixture();
  db.identity({
    subject: 'user_adm',
    role: 'admin',
    email: 'Admin@Exemplu.ro',
    name: 'Admin',
  });

  // Any staff mutation auto-records the caller, normalized to lowercase.
  await db.run(pos.createFair, { name: 'Târg Test' });
  const entries = db.all('staffDirectory');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].userId, 'user_adm');
  assert.equal(entries[0].email, 'admin@exemplu.ro');
  assert.equal(entries[0].role, 'admin');

  // The directory is listed only for staff roles.
  const directory = await db.run(staff.directory, {});
  assert.deepEqual(
    directory.map((row) => row.email),
    ['admin@exemplu.ro'],
  );
  db.identity({ subject: 'user_cust', role: 'customer' });
  await assert.rejects(db.run(staff.directory, {}), /Forbidden/i);
  await assert.rejects(
    db.run(staff.register, { email: 'x@exemplu.ro' }),
    /Forbidden/i,
  );
  assert.equal(db.all('staffDirectory').length, 1);

  // Sellers can be assigned by email once the directory knows them.
  db.seed('staffDirectory', 'dir-sel', {
    userId: 'user_sel',
    email: 'sel@exemplu.ro',
    updatedAt: 1,
  });
  db.identity({ subject: 'user_adm', role: 'admin' });
  await db.run(staff.assignFairSeller, {
    fairId: 'fair-1',
    userId: 'SEL@exemplu.ro',
  });
  assert.equal(
    db.all('fairAssignments').find((row) => row.fairId === 'fair-1').userId,
    'user_sel',
  );
  await assert.rejects(
    db.run(staff.assignFairSeller, {
      fairId: 'fair-1',
      userId: 'nobody@exemplu.ro',
    }),
    /ID Clerk valid sau email/i,
  );

  // staff.register stores the caller's own email fallback.
  db.identity({ subject: 'user_at', role: 'atelier' });
  await db.run(staff.register, { email: 'At@Exemplu.ro', name: 'Atelier' });
  assert.equal(
    db.all('staffDirectory').find((row) => row.userId === 'user_at').email,
    'at@exemplu.ro',
  );
});

test('admins can map a Clerk id to an email before first login', async () => {
  const db = fixture();
  db.identity({ subject: 'user_adm', role: 'admin' });

  await db.run(staff.setDirectoryEntry, {
    userId: 'user_new',
    email: 'Vanzator@Exemplu.ro',
    name: 'Vânzător',
    role: 'seller',
  });
  const entry = db
    .all('staffDirectory')
    .find((row) => row.userId === 'user_new');
  assert.equal(entry.email, 'vanzator@exemplu.ro');
  assert.equal(entry.name, 'Vânzător');
  assert.equal(entry.role, 'seller');

  // The mapped email then works everywhere an id did.
  await db.run(staff.assignFairSeller, {
    fairId: 'fair-1',
    userId: 'vanzator@exemplu.ro',
  });
  assert.equal(
    db.all('fairAssignments').find((row) => row.fairId === 'fair-1').userId,
    'user_new',
  );

  // The sellers dropdown lists only directory entries with the seller role.
  const sellerOptions = await db.run(staff.sellers, {});
  assert.deepEqual(
    sellerOptions.map((row) => row.email),
    ['vanzator@exemplu.ro'],
  );

  // Re-submitting updates the email instead of duplicating the row.
  await db.run(staff.setDirectoryEntry, {
    userId: 'user_new',
    email: 'nou@exemplu.ro',
  });
  assert.equal(
    db.all('staffDirectory').filter((row) => row.userId === 'user_new')
      .length,
    1,
  );
  assert.equal(
    db.all('staffDirectory').find((row) => row.userId === 'user_new').email,
    'nou@exemplu.ro',
  );

  await assert.rejects(
    db.run(staff.setDirectoryEntry, {
      userId: 'not-a-clerk-id',
      email: 'x@exemplu.ro',
    }),
    /ID Clerk valid/i,
  );
  await assert.rejects(
    db.run(staff.setDirectoryEntry, {
      userId: 'user_bad',
      email: 'fara-arond',
    }),
    /email valid/i,
  );

  // Only admins can edit the directory.
  db.identity({ subject: 'user_sel2', role: 'seller' });
  await assert.rejects(
    db.run(staff.setDirectoryEntry, {
      userId: 'user_new',
      email: 'x@exemplu.ro',
    }),
    /Forbidden|staff\.manage/i,
  );
});

test('POS still completes idempotent sales for sellers and admins', async () => {
  // An assigned seller completes a cash sale exactly once.
  const db = fixture();
  assignSeller(db, 'fair-1', 'user_sel');
  db.identity({ subject: 'user_sel', role: 'seller' });
  const args = prepareArgs('req-pos-0000000001');
  await db.run(pos.prepare, args);
  const first = await db.run(pos.complete, {
    requestId: args.requestId,
    receivedCents: 6000,
  });
  const second = await db.run(pos.complete, {
    requestId: args.requestId,
    receivedCents: 6000,
  });
  assert.deepEqual(first, second);
  assert.equal(db.all('posSales').length, 1);
  assert.equal(
    db.all('fairInventory').find((row) => row.productId === 'magnet').quantity,
    32,
  );
  assert.equal(
    db.all('stockMovements').filter((row) => row.kind === 'sale').length,
    1,
  );

  // An admin sells on a fair without any assignments.
  const adminDb = fixture();
  adminDb.identity({ subject: 'user_adm', role: 'admin' });
  const adminArgs = prepareArgs('req-pos-0000000002');
  await adminDb.run(pos.prepare, adminArgs);
  const sale = await adminDb.run(pos.complete, {
    requestId: adminArgs.requestId,
    receivedCents: 5000,
  });
  assert.equal(sale.totalCents, 5000);
  assert.equal(adminDb.all('posSales').length, 1);
});

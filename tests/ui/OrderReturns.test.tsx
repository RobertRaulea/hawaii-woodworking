import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getFunctionName } from 'convex/server';
import { ConvexError } from 'convex/values';
import { Toaster } from '../../src/components/ui/sonner';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import type { Id } from '../../convex/_generated/dataModel';

let myOrder: Record<string, unknown> | null = null;
let adminDetail: Record<string, unknown> | null = null;
let adminRows: unknown[] = [];

const mutation = mock.fn<(ref: unknown, args: unknown) => Promise<unknown>>(
  async () => ({}),
);
const convexQuery = mock.fn<(ref: unknown, args: unknown) => unknown>(
  async () => null,
);
const convexClient = { query: convexQuery, mutation };

const I18N: Record<string, string> = {
  'orders.returned': 'Returnată',
  'orders.cancelOrder': 'Anulează comanda',
  'orders.cancelDialogTitle': 'Anulează comanda',
  'orders.cancelExplain': 'Comanda va fi anulată și stocul eliberat.',
  'orders.cancelExplainRefund': 'Suma plătită va fi rambursată manual.',
  'orders.cancelReasonOptional': 'Motiv (opțional)',
  'orders.confirmCancel': 'Da, anulează comanda',
  'orders.cancelSuccess': 'Comanda a fost anulată.',
  'orders.cancelError': 'Anularea nu a reușit. Reîncearcă.',
  'orders.requestReturn': 'Cere retur',
  'orders.returnDialogTitle': 'Cere retur',
  'orders.returnReason': 'Motivul returului (obligatoriu)',
  'orders.confirmReturn': 'Trimite cererea',
  'orders.returnSuccess': 'Cererea de retur a fost trimisă.',
  'orders.returnError': 'Trimiterea cererii nu a reușit. Reîncearcă.',
  'orders.returnSent':
    'Cerere de retur trimisă la {{date}}. Te vom contacta cu pașii următori.',
  'orders.dismiss': 'Renunță',
  'orders.pending': 'În așteptare',
  'orders.paid': 'Plătită',
  'orders.shipped': 'Expediată',
  'orders.delivered': 'Livrată',
  'orders.cancelled': 'Anulată',
};

mock.module('react-i18next', {
  namedExports: {
    useTranslation: () => ({
      t: (key: string, opts?: { date?: string }) =>
        (I18N[key] ?? key).replace('{{date}}', opts?.date ?? ''),
      i18n: { language: 'ro' },
    }),
  },
});
mock.module('@clerk/clerk-react', {
  namedExports: {
    useAuth: () => ({ isSignedIn: true, isLoaded: true }),
    useUser: () => ({ user: { id: 'user_cust' } }),
  },
});
mock.module('convex/react', {
  namedExports: {
    useQuery: (ref: unknown) => {
      if (getFunctionName(ref as never) === 'orders:getMyOrders')
        return customerOrders;
      return undefined;
    },
    useMutation: (ref: unknown) => (args: unknown) => mutation(ref, args),
    useConvex: () => convexClient,
    useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  },
});
mock.module(
  new URL('../../src/hooks/useAdminQuery.ts', import.meta.url).href,
  {
    namedExports: {
      useAdminQuery: (query: unknown) => {
        const name = getFunctionName(query as never);
        if (name === 'orders:getMyOrderById')
          return { data: myOrder, error: null };
        if (name === 'orders:getAdmin')
          return { data: adminDetail, error: null };
        if (name === 'orders:listAdmin')
          return { data: adminRows, error: null };
        return { data: null, error: null };
      },
    },
  },
);
mock.module(
  new URL('../../src/hooks/useStaffAccess.ts', import.meta.url).href,
  { namedExports: { useStaffAccess: () => ({ userId: 'admin-1' }) } },
);
mock.module(
  new URL('../../src/hooks/useStaffDirectory.ts', import.meta.url).href,
  { namedExports: { useStaffDirectory: () => (id: string) => id } },
);
mock.module(
  new URL('../../src/hooks/useProductThumbnails.ts', import.meta.url).href,
  { namedExports: { useProductThumbnails: () => ({ get: () => undefined }) } },
);
mock.module(
  new URL(
    '../../src/pages/Admin/Orders/OrderInventoryReview.tsx',
    import.meta.url,
  ).href,
  { namedExports: { OrderInventoryReview: () => null } },
);
mock.module(
  new URL(
    '../../src/pages/Admin/Orders/InventoryReviewSummary.tsx',
    import.meta.url,
  ).href,
  { namedExports: { InventoryReviewSummary: () => null } },
);

let customerOrders: unknown[] = [];

const { MyOrderDetail } =
  await import('../../src/pages/MyOrders/MyOrderDetail.tsx');
const { MyOrders } = await import('../../src/pages/MyOrders/MyOrders.tsx');
const { OrderDetail } =
  await import('../../src/pages/Admin/Orders/OrderDetail.tsx');
const { AdminOrders } =
  await import('../../src/pages/Admin/Orders/AdminOrders.tsx');

const orderId = 'order-00000001' as Id<'orders'>;

const orderDoc = (overrides = {}) => ({
  _id: orderId,
  _creationTime: 1,
  customerId: 'cust-1',
  stripeSessionId: 'cs_test_x',
  items: [
    { productId: 'magnet', name: 'Magnet Sibiu', price: 25, quantity: 2 },
  ],
  total: 50,
  status: 'paid',
  paymentMethod: 'card',
  paymentConfirmedAt: 1,
  inventoryStatus: 'applied',
  createdAt: 1,
  customer: {
    email: 'client@exemplu.ro',
    firstName: 'Prenume',
    lastName: 'Nume',
    shippingAddress: {
      street: 'Str. 1',
      city: 'Sibiu',
      county: 'SB',
      postalCode: '550001',
      country: 'RO',
    },
    billingAddress: {
      street: 'Str. 1',
      city: 'Sibiu',
      county: 'SB',
      postalCode: '550001',
      country: 'RO',
    },
  },
  ...overrides,
});

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={[`/my-orders/${orderId}`]}>
      <Toaster />
      <Routes>
        <Route path="/my-orders/:id" element={<MyOrderDetail />} />
      </Routes>
    </MemoryRouter>,
  );

const renderAdmin = () =>
  render(
    <MemoryRouter initialEntries={[`/admin/orders/${orderId}`]}>
      <Toaster />
      <Routes>
        <Route path="/admin/orders/:id" element={<OrderDetail />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  myOrder = null;
  adminDetail = null;
  adminRows = [];
  customerOrders = [];
  mutation.mock.resetCalls();
  mutation.mock.mockImplementation(async () => ({}));
  convexQuery.mock.resetCalls();
  convexQuery.mock.mockImplementation(async () => ({ kind: 'returned' }));
  localStorage.clear();
});

it('„Anulează comanda" apare doar când comanda este eligibilă', async () => {
  myOrder = orderDoc();
  const view = renderDetail();
  await screen.findByRole('button', { name: 'Anulează comanda' });
  view.unmount();

  for (const status of ['shipped', 'delivered', 'cancelled', 'returned']) {
    myOrder = orderDoc({ status });
    const v = renderDetail();
    await v.findByText(/comanda/i, {}, { timeout: 3000 }).catch(() => null);
    assert.equal(
      screen.queryByRole('button', { name: 'Anulează comanda' }),
      null,
      `status ${status} must not show cancel`,
    );
    v.unmount();
  }

  myOrder = orderDoc({ fulfillmentStatus: 'packed' });
  const packed = renderDetail();
  await waitFor(() =>
    assert.equal(
      screen.queryByRole('button', { name: 'Anulează comanda' }),
      null,
    ),
  );
  packed.unmount();
});

it('cancelMine primește requestId și îl reutilizează la reîncercare după eroare', async () => {
  const user = userEvent.setup();
  myOrder = orderDoc();
  renderDetail();
  await user.click(
    await screen.findByRole('button', { name: 'Anulează comanda' }),
  );
  mutation.mock.mockImplementationOnce(async () => {
    throw new ConvexError(
      'Comanda nu poate fi anulată online. Contactează-ne și o rezolvăm împreună.',
    );
  });
  await user.click(
    await screen.findByRole('button', { name: 'Da, anulează comanda' }),
  );
  await screen.findByText(/nu poate fi anulată online/);
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  assert.equal(
    getFunctionName(mutation.mock.calls[0].arguments[0] as never),
    'orders:cancelMine',
  );
  const firstRequestId = (
    mutation.mock.calls[0].arguments[1] as { requestId: string }
  ).requestId;

  // Retry inside the same dialog reuses the same requestId.
  await user.click(
    screen.getByRole('button', { name: 'Da, anulează comanda' }),
  );
  await waitFor(() => assert.equal(mutation.mock.callCount(), 2));
  const secondRequestId = (
    mutation.mock.calls[1].arguments[1] as { requestId: string }
  ).requestId;
  assert.equal(secondRequestId, firstRequestId);
});

it('„Cere retur" doar pentru livrate în 14 zile și fără cerere existentă', async () => {
  const now = Date.now();
  const WINDOW = 14 * 24 * 3600 * 1000;

  myOrder = orderDoc({ status: 'delivered', deliveredAt: now - 24 * 3600e3 });
  const ok = renderDetail();
  await screen.findByRole('button', { name: 'Cere retur' });
  ok.unmount();

  myOrder = orderDoc({
    status: 'delivered',
    deliveredAt: now - WINDOW - 1,
  });
  const expired = renderDetail();
  await waitFor(() =>
    assert.equal(screen.queryByRole('button', { name: 'Cere retur' }), null),
  );
  expired.unmount();

  myOrder = orderDoc({
    status: 'delivered',
    deliveredAt: now - 24 * 3600e3,
    returnRequestedAt: now - 1000,
  });
  const requested = renderDetail();
  await screen.findByText(/Cerere de retur trimisă la/);
  assert.equal(
    screen.queryByRole('button', { name: 'Cere retur' }),
    null,
  );
  requested.unmount();
});

it('requestReturnMine trimite motivul și un requestId', async () => {
  const user = userEvent.setup();
  myOrder = orderDoc({
    status: 'delivered',
    deliveredAt: Date.now() - 24 * 3600e3,
  });
  renderDetail();
  await user.click(await screen.findByRole('button', { name: 'Cere retur' }));
  const submit = await screen.findByRole('button', {
    name: 'Trimite cererea',
  });
  assert.equal(submit.hasAttribute('disabled'), true);
  await user.type(
    screen.getByLabelText('Motivul returului (obligatoriu)'),
    'Produsul nu corespunde',
  );
  await user.click(submit);
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  assert.equal(
    getFunctionName(mutation.mock.calls[0].arguments[0] as never),
    'orders:requestReturnMine',
  );
  const args = mutation.mock.calls[0].arguments[1] as {
    requestId: string;
    orderId: string;
    reason: string;
  };
  assert.equal(args.orderId, orderId);
  assert.equal(args.reason, 'Produsul nu corespunde');
  assert.match(args.requestId, /^[a-zA-Z0-9-]{16,100}$/);
});

const adminDoc = (overrides = {}) => ({
  ...orderDoc(),
  shortNumber: '00000001',
  paymentStatus: 'paid',
  fulfillmentState: 'delivered',
  status: 'delivered',
  events: [],
  ...overrides,
});

it('admin: „Înregistrează retur" cere motiv și alegere stoc explicită', async () => {
  const user = userEvent.setup();
  adminDetail = adminDoc();
  renderAdmin();
  await user.click(
    await screen.findByRole('button', { name: 'Înregistrează retur' }),
  );
  await screen.findByText('Rambursare manuală necesară: 50.00 RON, din Stripe');
  // The open dialog makes the trigger inert: the only visible button with
  // this name is the submit inside the dialog.
  const submit = screen.getByRole('button', {
    name: 'Înregistrează retur',
  });
  assert.equal(submit.hasAttribute('disabled'), true);
  await user.type(
    screen.getByLabelText('Motivul returului (obligatoriu)'),
    'Clientul a returnat',
  );
  assert.equal(submit.hasAttribute('disabled'), true);
  await user.click(
    screen.getByLabelText(
      'Restochează produsele (verificate fizic, în stare bună)',
    ),
  );
  assert.equal(submit.hasAttribute('disabled'), false);
  await user.click(submit);
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  assert.equal(
    getFunctionName(mutation.mock.calls[0].arguments[0] as never),
    'orders:markReturned',
  );
  const args = mutation.mock.calls[0].arguments[1] as {
    reason: string;
    restock: boolean;
  };
  assert.equal(args.reason, 'Clientul a returnat');
  assert.equal(args.restock, true);
});

it('admin: linia de rambursare diferă pe card / ramburs livrat / refuzat', async () => {
  const user = userEvent.setup();
  for (const [doc, expected] of [
    [
      adminDoc({ paymentMethod: 'cod', paymentConfirmedAt: 5 }),
      'Clientul a plătit la curier: restituire manuală (transfer bancar): 50.00 RON',
    ],
    [
      adminDoc({
        status: 'shipped',
        paymentMethod: 'cod',
        paymentConfirmedAt: undefined,
        paymentStatus: 'pending',
        fulfillmentState: 'shipped',
      }),
      'Colet refuzat: nimic de restituit',
    ],
    [
      adminDoc({ status: 'shipped', fulfillmentState: 'shipped' }),
      'Rambursare manuală necesară: 50.00 RON, din Stripe',
    ],
  ] as const) {
    adminDetail = doc;
    const view = renderAdmin();
    await user.click(
      await screen.findByRole('button', { name: 'Înregistrează retur' }),
    );
    await screen.findByText(expected);
    view.unmount();
    mutation.mock.resetCalls();
  }
});

it('badge „Returnată" în lista clientului și în lista admin', async () => {
  customerOrders = [orderDoc({ status: 'returned' })];
  render(
    <MemoryRouter>
      <MyOrders />
    </MemoryRouter>,
  );
  await screen.findByText('Returnată');

  adminRows = [
    adminDoc({ fulfillmentState: 'returned', itemCount: 2 }),
  ];
  render(
    <MemoryRouter>
      <AdminOrders />
    </MemoryRouter>,
  );
  await screen.findAllByText('Returnată');
});

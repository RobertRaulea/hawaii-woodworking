import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getFunctionName } from 'convex/server';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import { toCsv } from '../../src/utils/csv.utils';

const staffAdmin = { role: 'admin', userId: 'admin-1', homePath: '/admin' };
const staffSeller = { role: 'seller', userId: 'user_sel', homePath: '/admin' };

let staff = staffAdmin;
let fairsData: { _id: string; name: string; active: boolean }[] = [];
let summaryData: unknown = undefined;
let summaryError: string | null = null;
let dashboardData: unknown = undefined;
let adminQueryArgs: unknown = null;

const queryMock = mock.fn<(reference: unknown, args?: unknown) => unknown>(
  (reference) => {
    if (getFunctionName(reference as never) === 'staff:me') return staff;
    if (getFunctionName(reference as never) === 'pos:listFairs')
      return fairsData;
    return undefined;
  },
);
const adminQuery = mock.fn<(query: unknown, args: unknown) => unknown>(
  (query, args) => {
    const name = getFunctionName(query as never);
    if (name === 'reports:summary') {
      adminQueryArgs = args;
      return { data: summaryData, error: summaryError };
    }
    if (name === 'reports:dashboard')
      return { data: dashboardData, error: null };
    if (name === 'pos:listFairs')
      return { data: fairsData, error: null };
    return { data: null, error: null };
  },
);

mock.module('convex/react', {
  namedExports: {
    useQuery: queryMock,
    useMutation: () => async () => ({}),
    useConvex: () => ({ query: async () => null, mutation: async () => ({}) }),
    usePaginatedQuery: () => ({
      results: [],
      status: 'Exhausted',
      loadMore: () => {},
    }),
    useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
    useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  },
});
mock.module(new URL('../../src/hooks/useAdminQuery.ts', import.meta.url).href, {
  namedExports: { useAdminQuery: adminQuery },
});
mock.module('@clerk/clerk-react', {
  namedExports: {
    useUser: () => ({ user: { id: 'user_1' } }),
    UserButton: () => null,
  },
});
mock.module(
  new URL(
    '../../src/pages/Admin/Fairs/FairSellers.tsx',
    import.meta.url,
  ).href,
  { namedExports: { FairSellers: () => null } },
);
mock.module(
  new URL(
    '../../src/hooks/useInventoryOperation.ts',
    import.meta.url,
  ).href,
  {
    namedExports: {
      useInventoryOperation: () => ({
        pending: null,
        completed: null,
        busy: false,
        online: true,
        blocked: false,
        error: '',
        start: async () => {},
        retry: async () => {},
        dismissCompleted: () => {},
      }),
    },
  },
);

const { Reports } = await import(
  '../../src/pages/Admin/Reports/Reports.tsx'
);
const { Dashboard } = await import(
  '../../src/pages/Admin/Dashboard/Dashboard.tsx'
);
const { AdminFairs } = await import(
  '../../src/pages/Admin/Fairs/AdminFairs.tsx'
);

const totals = (overrides = {}) => ({
  grossCents: 22500,
  discountCents: 1000,
  returnsCents: 4500,
  netCents: 17000,
  count: 7,
  units: 9,
  returnCount: 2,
  returnUnits: 2,
  ...overrides,
});

const summaryFixture = () => ({
  period: { from: '2026-04-01', to: '2026-04-30', timeZone: 'Europe/Bucharest' },
  filters: { channel: 'all', fairId: undefined },
  sales: {
    online: totals({ grossCents: 12500, netCents: 7500 }),
    pos: totals({ grossCents: 10000, netCents: 9500, returnsCents: 0 }),
    total: totals(),
  },
  posReturnsTracked: false,
  collections: {
    posCashCents: 4500,
    posCardCents: 5000,
    onlineCardConfirmedCents: 9000,
    onlineCardConfirmedCount: 3,
    onlineUnverifiedCents: 3000,
    onlineUnverifiedCount: 1,
    refundsManualCents: 2000,
    refundsManualCount: 1,
  },
  ordersByState: {
    byPayment: {
      pending: { count: 1, valueCents: 10000 },
      paid: { count: 4, valueCents: 12000 },
      cancelled: { count: 0, valueCents: 0 },
    },
    byFulfillment: {
      cancelled: 2,
      delivered: 0,
      shipped: 0,
      packed: 0,
      preparing: 0,
      ready: 2,
      blocked: 1,
    },
  },
  posByFair: [
    {
      fairId: 'fair-1',
      fairName: 'Targ Craciun',
      grossCents: 8000,
      discountCents: 500,
      netCents: 7500,
      cashCents: 4500,
      cardCents: 3000,
      count: 2,
      units: 3,
    },
  ],
  productsSold: [
    {
      productId: 'magnet',
      name: 'Magnet Sibiu',
      onlineUnits: 3,
      onlineReturnedUnits: 1,
      posUnits: 2,
      units: 4,
      grossCents: 12500,
    },
  ],
  byDay: [{ date: '2026-04-01', onlineNetCents: 7500, posNetCents: 9500 }],
});

const setup = () => {
  queryMock.mock.resetCalls();
  adminQuery.mock.resetCalls();
  adminQueryArgs = null;
};

it('Reports randează tabelele din sumar și schimbarea filtrelor actualizează argumentele', async () => {
  const user = userEvent.setup();
  staff = staffAdmin;
  fairsData = [
    { _id: 'fair-1', name: 'Targ Craciun', active: true },
    { _id: 'fair-2', name: 'Targ B', active: false },
  ];
  summaryData = summaryFixture();
  summaryError = null;
  setup();
  render(
    <MemoryRouter initialEntries={['/admin/reports?from=2026-04-01&to=2026-04-30']}>
      <Routes>
        <Route path="/admin/reports" element={<Reports />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText('Sumar vânzări');
  assert.ok(screen.getAllByText('170.00 RON').length >= 1);
  assert.ok(screen.getByText('Online neverificat (comenzi vechi)'));
  assert.ok(screen.getAllByText('Targ Craciun').length >= 1);
  assert.ok(screen.getByText('Magnet Sibiu'));
  assert.deepEqual(adminQueryArgs, {
    from: '2026-04-01',
    to: '2026-04-30',
    channel: 'all',
  });

  await user.selectOptions(screen.getByLabelText('Canal'), 'online');
  await waitFor(() =>
    assert.deepEqual(adminQueryArgs, {
      from: '2026-04-01',
      to: '2026-04-30',
      channel: 'online',
    }),
  );
});

it('selectarea unui târg forțează canalul POS și trimite fairId', async () => {
  const user = userEvent.setup();
  staff = staffAdmin;
  fairsData = [{ _id: 'fair-1', name: 'Targ Craciun', active: true }];
  summaryData = summaryFixture();
  setup();
  render(
    <MemoryRouter initialEntries={['/admin/reports?from=2026-04-01&to=2026-04-30']}>
      <Routes>
        <Route path="/admin/reports" element={<Reports />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText('Sumar vânzări');
  await user.selectOptions(screen.getByLabelText('Locație'), 'fair-1');
  await waitFor(() =>
    assert.deepEqual(adminQueryArgs, {
      from: '2026-04-01',
      to: '2026-04-30',
      channel: 'pos',
      fairId: 'fair-1',
    }),
  );
});

it('eroarea backend ajunge în alertă, nu devine 0', async () => {
  staff = staffAdmin;
  summaryData = undefined;
  summaryError = 'Datele nu pot fi încărcate.';
  setup();
  render(
    <MemoryRouter>
      <Reports />
    </MemoryRouter>,
  );
  const alert = await screen.findByRole('alert');
  assert.ok(alert.textContent?.includes('Datele nu pot fi încărcate.'));
  assert.ok(!alert.textContent?.includes('0'));
});

it('toCsv protejează celulele cu formulă și escapează ghilimelele', () => {
  const csv = toCsv([
    ['Produs', 'Valoare'],
    ['=SUM(A1)', 123],
    ['a"b', null],
  ]);
  const lines = csv.split('\r\n');
  assert.ok(lines[1].startsWith('"\'=SUM(A1)"'));
  assert.ok(lines[2].startsWith('"a""b"'));
  assert.ok(lines[2].endsWith('""'));
});

it('Dashboard afișează doar secțiunile permise rolului', async () => {
  staff = staffAdmin;
  dashboardData = {
    today: '2026-04-01',
    sales: {
      today: {
        sales: { online: totals(), pos: totals(), total: totals() },
        collections: {
          posCashCents: 4500,
          posCardCents: 5000,
          onlineCardConfirmedCents: 9000,
          onlineCardConfirmedCount: 3,
          onlineUnverifiedCents: 3000,
          onlineUnverifiedCount: 1,
          refundsManualCents: 2000,
          refundsManualCount: 1,
        },
      },
      month: {
        sales: { online: totals(), pos: totals(), total: totals() },
        collections: {
          posCashCents: 0,
          posCardCents: 0,
          onlineCardConfirmedCents: 0,
          onlineCardConfirmedCount: 0,
          onlineUnverifiedCents: 0,
          onlineUnverifiedCount: 0,
          refundsManualCents: 0,
          refundsManualCount: 0,
        },
      },
    },
    fulfillment: { ready: 2, preparing: 1, packed: 3 },
    lowStock: {
      count: 1,
      rows: [
        {
          productId: 'stea',
          name: 'Stea lemn',
          sku: 'ST-1',
          available: 3,
          threshold: 5,
        },
      ],
    },
    transfers: {
      count: 1,
      inTransitUnits: 3,
      rows: [
        {
          _id: 'tr-1',
          fromName: 'Atelier',
          toName: 'Targ Craciun',
          status: 'in_transit',
          inTransitUnits: 3,
          shippedAt: 1,
        },
      ],
    },
    exceptions: { needsReview: 1, posPrepared: 2, invalidBalances: 0 },
    pos: null,
  };
  setup();
  const { unmount } = render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
  await screen.findByText('Comenzi de pregătit');
  assert.ok(screen.getByText('Stoc redus'));
  assert.ok(screen.getByText('Excepții'));
  const readyLink = screen.getByRole('link', { name: /De pregătit/ });
  assert.equal(
    readyLink.getAttribute('href'),
    '/admin/fulfillment?tab=ready',
  );
  const lowLink = screen.getByRole('link', { name: /Vezi toate în Stocuri/ });
  assert.equal(
    lowLink.getAttribute('href'),
    '/admin/inventory?availability=low',
  );
  unmount();

  // Seller sees only POS + transfers.
  staff = staffSeller;
  dashboardData = {
    today: '2026-04-01',
    sales: null,
    fulfillment: null,
    lowStock: null,
    transfers: { count: 0, inTransitUnits: 0, rows: [] },
    exceptions: null,
    pos: [
      {
        fairId: 'fair-1',
        fairName: 'Targ Craciun',
        netCents: 7500,
        cashCents: 4500,
        cardCents: 3000,
        count: 2,
        units: 3,
      },
    ],
  };
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
  await screen.findByText('Vânzările mele de azi pe târg');
  assert.ok(screen.getByText(/75\.00 RON/));
  assert.equal(screen.queryByText('Excepții'), null);
  assert.equal(screen.queryByText('Comenzi de pregătit'), null);
});

it('cardul de târg arată vânzările de azi și link Raport', async () => {
  staff = staffAdmin;
  fairsData = [
    { _id: 'fair-1', name: 'Targ Craciun', active: true },
  ];
  summaryData = summaryFixture();
  summaryError = null;
  setup();
  render(
    <MemoryRouter>
      <AdminFairs />
    </MemoryRouter>,
  );
  await screen.findByText(/Azi: 75\.00 RON · 2 bonuri/);
  const link = screen.getByRole('link', { name: 'Raport' });
  assert.ok(
    link
      .getAttribute('href')
      ?.startsWith('/admin/reports?channel=pos&fairId=fair-1'),
  );
});

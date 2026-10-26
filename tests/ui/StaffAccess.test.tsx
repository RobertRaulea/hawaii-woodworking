import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getFunctionName } from 'convex/server';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import { hasPermission } from '../../convex/lib/permissions';
import type { StaffRole } from '../../convex/lib/permissions';
import { fair, product } from './fixtures';

const HOME: Record<StaffRole, string> = {
  admin: '/admin/dashboard',
  seller: '/admin/pos',
  atelier: '/admin/inventory',
};

let role: StaffRole | null = 'admin';
const convexQuery = mock.fn<(reference: unknown, args?: unknown) => unknown>(
  () => undefined,
);
const adminQuery = mock.fn<(reference: unknown, args?: unknown) => unknown>(
  () => ({ data: undefined, error: null }),
);
const mutation = mock.fn<(args: unknown) => Promise<unknown>>(async () => ({}));
const payment = {
  pending: null,
  completed: null,
  outstanding: [],
  blocked: false,
  busy: false,
  online: true,
  error: '',
  start: mock.fn<(args: unknown) => Promise<void>>(async () => {}),
};

mock.module('@clerk/clerk-react', {
  namedExports: {
    useUser: () => ({ user: { id: 'user_1' } }),
    UserButton: () => null,
  },
});
mock.module(
  new URL('../../src/hooks/useStaffAccess.ts', import.meta.url).href,
  {
    namedExports: {
      useStaffAccess: () => ({
        isLoading: false,
        isAuthenticated: true,
        role,
        userId: 'user_1',
        homePath: role ? HOME[role] : null,
        can: (permission: Parameters<typeof hasPermission>[1]) =>
          hasPermission(role, permission),
      }),
    },
  },
);
mock.module('convex/react', {
  namedExports: {
    useQuery: convexQuery,
    useMutation: () => mutation,
    usePaginatedQuery: () => ({
      results: [],
      status: 'Exhausted',
      loadMore: () => {},
    }),
    useConvex: () => ({
      query: async () => null,
      mutation: async () => ({}),
    }),
    useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
    useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  },
});
mock.module(new URL('../../src/hooks/useAdminQuery.ts', import.meta.url).href, {
  namedExports: { useAdminQuery: adminQuery },
});
mock.module(
  new URL('../../src/pages/Admin/PointOfSale/usePosPayment.ts', import.meta.url)
    .href,
  { namedExports: { usePosPayment: () => payment } },
);

const { AdminRoute } =
  await import('../../src/components/AdminRoute/AdminRoute.tsx');
const { StaffHome } =
  await import('../../src/components/AdminRoute/StaffHome.tsx');
const { AdminLayout } =
  await import('../../src/pages/Admin/AdminLayout.tsx');
const { AdminInventory } =
  await import('../../src/pages/Admin/Inventory/AdminInventory.tsx');
const { PointOfSale } =
  await import('../../src/pages/Admin/PointOfSale/PointOfSale.tsx');
const { FairSellers } =
  await import('../../src/pages/Admin/Fairs/FairSellers.tsx');

const stub = (label: string) => {
  const Page = () => <h1>{label}</h1>;
  return Page;
};

const tree = (
  <Routes>
    <Route path="admin" element={<AdminRoute />}>
      <Route element={<AdminRoute permission="pos.sell" />}>
        <Route path="pos" element={stub('PAGINA POS')()} />
      </Route>
      <Route element={<AdminLayout />}>
        <Route index element={<StaffHome />} />
        <Route element={<AdminRoute permission="dashboard.view" />}>
          <Route path="dashboard" element={stub('PAGINA PANOU')()} />
        </Route>
        <Route element={<AdminRoute permission="catalog.manage" />}>
          <Route path="products" element={stub('PAGINA CATALOG')()} />
        </Route>
        <Route element={<AdminRoute permission="inventory.read" />}>
          <Route path="inventory" element={stub('PAGINA STOCURI')()} />
        </Route>
        <Route element={<AdminRoute permission="orders.fulfill" />}>
          <Route path="orders" element={stub('PAGINA COMENZI')()} />
        </Route>
      </Route>
    </Route>
  </Routes>
);

const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}>{tree}</MemoryRouter>);

const navLabels = () =>
  screen
    .getAllByRole('link')
    .map((link) => link.textContent?.trim())
    .filter(Boolean);

beforeEach(() => {
  role = 'admin';
  convexQuery.mock.resetCalls();
  convexQuery.mock.mockImplementation(() => undefined);
  adminQuery.mock.resetCalls();
  adminQuery.mock.mockImplementation(() => ({ data: undefined, error: null }));
  mutation.mock.resetCalls();
});

it('autentificat fără rol intern primește refuzul în română', () => {
  role = null;
  renderAt('/admin/products');
  assert.ok(screen.getByText('Acces intern indisponibil'));
  assert.ok(screen.getByText('Contul tău nu are un rol intern.'));
  assert.equal(screen.queryByText('PAGINA CATALOG'), null);
});

it('seller intră pe POS și vede doar navigarea permisă', () => {
  role = 'seller';
  renderAt('/admin');
  assert.ok(screen.getByText('PAGINA POS'));
});

it('seller este refuzat pe catalog și are meniu restrâns', () => {
  role = 'seller';
  renderAt('/admin/products');
  assert.ok(screen.getByText('Acces intern indisponibil'));
  assert.equal(screen.queryByText('PAGINA CATALOG'), null);
  const labels = navLabels();
  assert.ok(labels.some((label) => label?.includes('Vânzări la târg')));
  assert.ok(labels.some((label) => label?.includes('Stocuri')));
  assert.ok(labels.some((label) => label?.includes('Panou')));
  for (const denied of ['Târguri', 'Produse', 'Categorii', 'La comandă', 'Comenzi', 'Pregătire comenzi', 'Rapoarte', 'Clienți'])
    assert.ok(!labels.some((label) => label?.includes(denied)), denied);
});

it('atelier intră pe stocuri și nu vede POS sau catalog', () => {
  role = 'atelier';
  renderAt('/admin');
  assert.ok(screen.getByText('PAGINA STOCURI'));
  const labels = navLabels();
  assert.ok(labels.some((label) => label?.includes('Stocuri')));
  assert.ok(labels.some((label) => label?.includes('Pregătire comenzi')));
  assert.ok(labels.some((label) => label?.includes('Panou')));
  assert.ok(!labels.some((label) => label?.includes('Rapoarte')));
  assert.ok(!labels.some((label) => label?.includes('Comenzi')));
  assert.ok(!labels.some((label) => label?.includes('Vânzări la târg')));
  assert.ok(!labels.some((label) => label?.includes('Clienți')));
});

it('admin intră pe panou și vede întreg meniul', () => {
  role = 'admin';
  renderAt('/admin');
  assert.ok(screen.getByText('PAGINA PANOU'));
  const labels = navLabels();
  for (const expected of [
    'Panou',
    'Vânzări la târg',
    'Târguri',
    'Stocuri',
    'Produse',
    'Categorii',
    'La comandă',
    'Rapoarte',
    'Pregătire comenzi',
    'Comenzi',
    'Clienți',
  ])
    assert.ok(labels.some((label) => label?.includes(expected)), expected);
});

it('seller vede stocul alocat fără butoane de transfer', () => {
  role = 'seller';
  adminQuery.mock.mockImplementation(() => ({
    data: {
      scope: 'assigned',
      fairs: [fair],
      products: [
        {
          ...product,
          onlineStock: null,
          onlinePhysicalStock: null,
          onlineHeldOrders: null,
          totalStock: null,
        },
      ],
      issues: [],
    },
    error: null,
  }));
  render(
    <MemoryRouter>
      <AdminInventory />
    </MemoryRouter>,
  );
  assert.equal(
    screen.queryByRole('button', { name: 'Transfer' }),
    null,
  );
  assert.equal(screen.queryByRole('button', { name: 'Stoc' }), null);
  assert.ok(screen.getByRole('columnheader', { name: 'Fizic' }));
  assert.ok(screen.getByRole('columnheader', { name: 'Disponibil' }));
  assert.equal(screen.queryByText('Total înregistrat'), null);
});

it('admin vede indicatorul de solicitări de transfer în așteptare', async () => {
  role = 'admin';
  convexQuery.mock.mockImplementation((reference, args) => {
    if (args === 'skip') return undefined;
    if (getFunctionName(reference as never) === 'transfers:pendingRequestCount')
      return 2;
    return undefined;
  });
  renderAt('/admin');
  await waitFor(() => {
    const link = screen.getByRole('link', { name: /Transferuri/ });
    assert.ok(link.textContent?.includes('2'));
  });
});

it('seller nu interogează solicitările de transfer în așteptare', () => {
  role = 'seller';
  renderAt('/admin');
  const calls = convexQuery.mock.calls.filter(
    (call) =>
      getFunctionName(call.arguments[0] as never) ===
      'transfers:pendingRequestCount',
  );
  assert.ok(calls.length >= 1);
  assert.ok(calls.every((call) => call.arguments[1] === 'skip'));
  assert.equal(
    screen.queryByRole('link', { name: /Transferuri.*solicitări/ }),
    null,
  );
});

it('seller nu are legătura de administrare a târgurilor în POS', () => {
  role = 'seller';
  convexQuery.mock.mockImplementation((reference, args) => {
    if (args === 'skip') return undefined;
    if (getFunctionName(reference as never) === 'pos:listFairs') return [];
    return undefined;
  });
  render(
    <MemoryRouter>
      <PointOfSale />
    </MemoryRouter>,
  );
  assert.equal(
    screen.queryByRole('link', { name: 'Administrează târgurile' }),
    null,
  );
  assert.ok(
    screen.getByText(/Nu ai târguri active alocate/),
  );
});

it('FairSellers alocă vânzătorul ales din dropdown', async () => {
  role = 'admin';
  adminQuery.mock.mockImplementation((reference) => {
    const name = getFunctionName(reference as never);
    if (name === 'staff:sellers' || name === 'staff:directory')
      return {
        data: [{ userId: 'user_abc', email: 'vanzator@exemplu.ro' }],
        error: null,
      };
    return { data: [], error: null };
  });
  render(
    <MemoryRouter>
      <FairSellers fairId={fair._id} />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByLabelText('Vânzător'));
  await user.click(
    screen.getByRole('option', { name: 'vanzator@exemplu.ro' }),
  );
  await user.click(screen.getByRole('button', { name: 'Alocă' }));
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  assert.deepEqual(mutation.mock.calls[0].arguments[0], {
    fairId: fair._id,
    userId: 'vanzator@exemplu.ro',
  });
});

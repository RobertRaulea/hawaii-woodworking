import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from '../../src/components/ui/sonner';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import type { InventoryController } from '../../src/types/inventory.types';
import { fair, product, operationMock, receipt } from './fixtures';

const query = mock.fn<(query: unknown, args: unknown) => unknown>(() => ({}));
let operation: InventoryController = operationMock();
mock.module('@clerk/clerk-react', {
  namedExports: { useUser: () => ({ user: { id: 'admin-1' } }) },
});
mock.module(
  new URL('../../src/hooks/useStaffAccess.ts', import.meta.url).href,
  {
    namedExports: {
      useStaffAccess: () => ({
        isLoading: false,
        isAuthenticated: true,
        role: 'admin',
        userId: 'admin-1',
        homePath: '/admin/products',
        can: () => true,
      }),
    },
  },
);
mock.module('convex/react', {
  namedExports: {
    usePaginatedQuery: () => ({
      results: [],
      status: 'Exhausted',
      loadMore: () => {},
    }),
    useConvex: () => ({ query: async () => null, mutation: async () => ({}) }),
    useMutation: () => async () => ({}),
    useQuery: () => undefined,
    useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
    useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  },
});
mock.module(new URL('../../src/hooks/useAdminQuery.ts', import.meta.url).href, {
  namedExports: { useAdminQuery: query },
});
mock.module(
  new URL('../../src/hooks/useInventoryOperation.ts', import.meta.url).href,
  { namedExports: { useInventoryOperation: () => operation } },
);
mock.module(
  new URL('../../src/hooks/useStockOperation.ts', import.meta.url).href,
  {
    namedExports: {
      useStockOperation: () => ({
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
mock.module(
  new URL(
    '../../src/pages/Admin/Orders/InventoryReviewSummary.tsx',
    import.meta.url,
  ).href,
  { namedExports: { InventoryReviewSummary: () => null } },
);
const { AdminInventory } =
  await import('../../src/pages/Admin/Inventory/AdminInventory.tsx');

beforeEach(() => {
  query.mock.mockImplementation(() => ({
    data: { fairs: [fair], products: [product], issues: [] },
    error: null,
  }));
  operation = operationMock();
});

it('afișează stocul pe locația „toate” și filtrarea după SKU', async () => {
  render(
    <MemoryRouter>
      <AdminInventory />
    </MemoryRouter>,
  );
  const row = screen.getByRole('row', { name: /Magnet Sibiu/ });
  const cells = within(row).getAllByRole('cell');
  assert.equal(cells[1].textContent, '134');
  assert.equal(cells[2].textContent, '0');
  assert.equal(cells[3].textContent, '134');
  await userEvent
    .setup()
    .type(screen.getByLabelText('Caută produse'), 'absent');
  assert.equal(screen.queryByRole('row', { name: /Magnet Sibiu/ }), null);
  assert.ok(screen.getByText('Niciun produs nu corespunde căutării.'));
});

it('transferul navighează către modulul Transferuri cu produs și sursă', () => {
  render(
    <MemoryRouter>
      <AdminInventory />
    </MemoryRouter>,
  );
  const link = screen.getByRole('link', { name: 'Transfer' });
  const href = link.getAttribute('href') ?? '';
  assert.match(href, /\/admin\/transfers\/new/);
  assert.match(href, new RegExp(`productId=${product.id}`));
  assert.match(href, /from=workshop/);
});

it('confirmarea stocului poate fi închisă manual', async () => {
  const controller = operationMock();
  operation = { ...controller, completed: receipt };
  render(
    <MemoryRouter>
      <Toaster />
      <AdminInventory />
    </MemoryRouter>,
  );
  await screen.findByText(/Total: 134/);
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Închide notificarea' }));
  assert.equal(controller.dismissCompleted.mock.callCount(), 1);
});

it('selectarea unui târg arată stocul acelui târg', () => {
  query.mock.mockImplementation(() => ({
    data: {
      fairs: [fair, { ...fair, _id: 'other-fair', name: 'Alt târg' }],
      products: [
        {
          ...product,
          fairsStock: 40,
          totalStock: 140,
          fairs: [
            ...product.fairs,
            { fairId: 'other-fair', name: 'Alt târg', quantity: 6 },
          ],
        },
      ],
      issues: [],
    },
    error: null,
  }));
  render(
    <MemoryRouter initialEntries={['/admin/inventory?fairId=other-fair']}>
      <AdminInventory />
    </MemoryRouter>,
  );
  const cells = within(
    screen.getByRole('row', { name: /Magnet Sibiu/ }),
  ).getAllByRole('cell');
  assert.equal(cells[1].textContent, '6');
  assert.equal(cells[2].textContent, '0');
  assert.equal(cells[3].textContent, '6');
});

it('fără conexiune explică de ce operațiunile sunt blocate', () => {
  operation = { ...operationMock(), online: false };
  render(
    <MemoryRouter>
      <AdminInventory />
    </MemoryRouter>,
  );
  assert.ok(
    screen.getAllByRole('status').some((el) => el.textContent?.includes('Fără conexiune')),
  );
  assert.equal(
    screen
      .getByRole('button', { name: 'Stoc' })
      .hasAttribute('disabled'),
    true,
  );
});

it('separă disponibilul de rezervările pentru comenzi plătite', () => {
  query.mock.mockImplementation(() => ({
    data: {
      fairs: [fair],
      products: [
        {
          ...product,
          onlineStock: 70,
          onlinePhysicalStock: 100,
          onlineHeldOrders: 30,
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
  const cells = within(
    screen.getByRole('row', { name: /Magnet Sibiu/ }),
  ).getAllByRole('cell');
  assert.equal(cells[1].textContent, '134');
  assert.equal(cells[2].textContent, '30');
  assert.equal(cells[3].textContent, '104');
});

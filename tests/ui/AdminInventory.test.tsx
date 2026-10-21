import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import type { InventoryController } from '../../src/types/inventory.types';
import { fair, product, operationMock, receipt } from './fixtures';

const query = mock.fn<(query: unknown, args: unknown) => unknown>(() => ({}));
let operation: InventoryController = operationMock();
mock.module('@clerk/clerk-react', {
  namedExports: { useUser: () => ({ user: { id: 'admin-1' } }) },
});
mock.module(new URL('../../src/hooks/useAdminQuery.ts', import.meta.url).href, {
  namedExports: { useAdminQuery: query },
});
mock.module(
  new URL('../../src/hooks/useInventoryOperation.ts', import.meta.url).href,
  { namedExports: { useInventoryOperation: () => operation } },
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

it('afișează cele trei stocuri și filtrarea după SKU', async () => {
  render(
    <MemoryRouter>
      <AdminInventory />
    </MemoryRouter>,
  );
  const row = screen.getByRole('row', { name: /Magnet Sibiu/ });
  const cells = within(row).getAllByRole('cell');
  assert.equal(cells[1].textContent, '134');
  assert.equal(cells[2].textContent, '100');
  assert.equal(cells[3].textContent, '34');
  await userEvent
    .setup()
    .type(screen.getByLabelText('Caută produs sau SKU'), 'absent');
  assert.equal(screen.queryByRole('row', { name: /Magnet Sibiu/ }), null);
  assert.ok(screen.getByText('Niciun produs nu corespunde căutării.'));
});

it('deschide transferul numai în Admin și oferă direcția inversă', async () => {
  render(
    <MemoryRouter>
      <AdminInventory />
    </MemoryRouter>,
  );
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Transferă Magnet Sibiu' }));
  assert.ok(screen.getByRole('dialog', { name: 'Transfer de stoc' }));
  assert.ok(screen.getByRole('option', { name: 'Târg → online' }));
});

it('confirmarea stocului poate fi închisă manual', async () => {
  const controller = operationMock();
  operation = { ...controller, completed: receipt };
  render(
    <MemoryRouter>
      <AdminInventory />
    </MemoryRouter>,
  );
  assert.ok(screen.getByRole('status').textContent?.includes('Total: 134'));
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Închide notificarea' }));
  assert.equal(controller.dismissCompleted.mock.callCount(), 1);
});

it('filtrarea pe un târg nu ascunde celelalte alocări din total', () => {
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
  assert.equal(cells[1].textContent, '140');
  assert.equal(cells[3].textContent, '40');
  assert.equal(cells[4].textContent, '6');
});

it('fără conexiune explică de ce transferurile sunt blocate', () => {
  operation = { ...operationMock(), online: false };
  render(
    <MemoryRouter>
      <AdminInventory />
    </MemoryRouter>,
  );
  assert.ok(screen.getByRole('status').textContent?.includes('Fără conexiune'));
  assert.equal(
    screen
      .getByRole('button', { name: 'Transferă Magnet Sibiu' })
      .hasAttribute('disabled'),
    true,
  );
});

it('separă disponibilul de stocul fizic ținut fără a dubla totalul', () => {
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
  assert.ok(cells[2].textContent?.startsWith('70'));
  assert.ok(cells[2].textContent?.includes('Fizic: 100'));
  assert.ok(cells[2].textContent?.includes('Ținute: 30'));
  assert.ok(screen.getByText(/30 buc. din stocul fizic online/));
});

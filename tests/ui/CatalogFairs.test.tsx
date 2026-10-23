import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { getFunctionName } from 'convex/server';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import { fair, product, operationMock } from './fixtures';
import type { Id } from '../../convex/_generated/dataModel';

const query = mock.fn<(reference: unknown, args?: unknown) => unknown>(
  () => undefined,
);
const mutation = mock.fn<(reference: unknown, args: unknown) => Promise<unknown>>(
  async () => 'new-id',
);
const adminQuery = mock.fn<(reference: unknown, args: unknown) => unknown>(
  () => ({ data: null, error: null }),
);

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
    useQuery: query,
    useMutation: () => mutation,
    usePaginatedQuery: () => ({
      results: [],
      status: 'Exhausted',
      loadMore: () => {},
    }),
    useConvex: () => ({ mutation, query: async () => null }),
  },
});
mock.module(
  new URL('../../src/hooks/useAdminQuery.ts', import.meta.url).href,
  { namedExports: { useAdminQuery: adminQuery } },
);
mock.module(
  new URL('../../src/hooks/useInventoryOperation.ts', import.meta.url).href,
  { namedExports: { useInventoryOperation: () => operationMock() } },
);
mock.module(
  new URL('../../src/pages/Admin/PointOfSale/usePosPayment.ts', import.meta.url)
    .href,
  {
    namedExports: {
      usePosPayment: () => ({
        pending: null,
        completed: null,
        outstanding: [],
        blocked: false,
        busy: false,
        online: true,
        error: '',
        start: async () => {},
      }),
    },
  },
);

const { AdminProducts } =
  await import('../../src/pages/Admin/Products/AdminProducts.tsx');
const { ProductForm } =
  await import('../../src/pages/Admin/Products/ProductForm.tsx');
const { AdminCategories } =
  await import('../../src/pages/Admin/Categories/AdminCategories.tsx');
const { AdminFairs } =
  await import('../../src/pages/Admin/Fairs/AdminFairs.tsx');
const { PointOfSale } =
  await import('../../src/pages/Admin/PointOfSale/PointOfSale.tsx');

const catalogProduct = (overrides = {}) => ({
  _id: 'magnet' as Id<'products'>,
  _creationTime: 1,
  name: 'Magnet Sibiu',
  price: 25,
  sku: 'MAG-01',
  category: 'Suveniruri',
  stock: 100,
  trackStock: true,
  status: 'active' as const,
  imageUrls: [null],
  ...overrides,
});

let catalog: ReturnType<typeof catalogProduct>[] = [];
let categoriesList: { _id: string; name: string }[] = [];
let fairsList: Record<string, unknown>[] = [];

beforeEach(() => {
  catalog = [
    catalogProduct(),
    catalogProduct({
      _id: 'brad' as Id<'products'>,
      name: 'Ornament Brad',
      sku: 'BRD-02',
      category: 'Crăciun',
      active: false,
      status: 'inactive',
    }),
    catalogProduct({
      _id: 'old' as Id<'products'>,
      name: 'Produs Vechi',
      sku: '',
      category: 'Suveniruri',
      status: 'archived',
      archivedAt: 1,
      active: false,
    }),
  ];
  categoriesList = [
    { _id: 'cat-1', name: 'Suveniruri' },
    { _id: 'cat-2', name: 'Crăciun' },
  ];
  fairsList = [fair as unknown as Record<string, unknown>];
  mutation.mock.resetCalls();
  query.mock.mockImplementation((reference, args) => {
    if (args === 'skip') return undefined;
    const name = getFunctionName(reference as never);
    if (name === 'products:listAdmin') return catalog;
    if (name === 'categories:getAll') return categoriesList;
    if (name === 'pos:listFairs') return fairsList;
    if (name === 'pos:workspace')
      return [
        {
          ...product,
          id: 'prod-1',
          stock: 34,
          unitPriceCents: 2500,
          image: '',
        },
      ];
    if (name === 'pos:dailySummary')
      return { count: 0, units: 0, totalCents: 0, cashCents: 0, cardCents: 0 };
    return undefined;
  });
  adminQuery.mock.mockImplementation((reference) => {
    const name = getFunctionName(reference as never);
    if (name === 'pos:listFairs') return { data: fairsList, error: null };
    if (name === 'staff:listFairSellers') return { data: [], error: null };
    return { data: null, error: null };
  });
});

it('AdminProducts filtrează după căutare, categorie și stare', async () => {
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter>
      <AdminProducts />
    </MemoryRouter>,
  );

  // Default hides archived.
  assert.ok(screen.getByText('Magnet Sibiu'));
  assert.ok(screen.getByText('Ornament Brad'));
  assert.equal(screen.queryByText('Produs Vechi'), null);

  // Status filter shows archived.
  await user.selectOptions(screen.getByLabelText('Stare'), 'archived');
  assert.ok(screen.getByText('Produs Vechi'));
  assert.equal(screen.queryByText('Magnet Sibiu'), null);
  await user.selectOptions(screen.getByLabelText('Stare'), 'visible');

  // Search by SKU.
  await user.type(
    screen.getByPlaceholderText(/Caută după nume sau SKU/),
    'brd-02',
  );
  assert.ok(screen.getByText('Ornament Brad'));
  assert.equal(screen.queryByText('Magnet Sibiu'), null);
  await user.clear(screen.getByPlaceholderText(/Caută după nume sau SKU/));

  // Category filter.
  await user.selectOptions(screen.getByLabelText('Categorie'), 'Crăciun');
  assert.ok(screen.getByText('Ornament Brad'));
  assert.equal(screen.queryByText('Magnet Sibiu'), null);
  view.unmount();
});

it('AdminProducts paginează la 20 de produse', async () => {
  catalog = Array.from({ length: 25 }, (_, index) =>
    catalogProduct({
      _id: `prod-${index}` as Id<'products'>,
      name: `Produs ${String(index).padStart(2, '0')}`,
      sku: `SKU-${index}`,
    }),
  );
  render(
    <MemoryRouter>
      <AdminProducts />
    </MemoryRouter>,
  );
  assert.ok(screen.getByText('Pagina 1 din 2'));
  await userEvent.setup().click(screen.getByRole('button', { name: 'Înainte' }));
  assert.ok(screen.getByText('Pagina 2 din 2'));
  assert.ok(screen.getByText('Produs 24'));
  assert.equal(screen.queryByText('Produs 00'), null);
});

it('AdminProducts arhivează după confirmare', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <AdminProducts />
    </MemoryRouter>,
  );
  await user.click(
    screen.getAllByRole('button', { name: 'Arhivează' })[0],
  );
  assert.ok(
    screen.getByText(/Produsul dispare din magazin și POS/),
  );
  const dialog = screen.getByRole('dialog');
  await user.click(
    within(dialog).getByRole('button', { name: 'Arhivează' }),
  );
  assert.equal(mutation.mock.callCount() > 0, true);
  assert.deepEqual(mutation.mock.calls[0].arguments[0], { id: 'magnet' });
});

it('ProductForm afișează câmpul SKU', () => {
  render(
    <MemoryRouter>
      <ProductForm />
    </MemoryRouter>,
  );
  assert.ok(screen.getByLabelText('SKU'));
});

it('AdminCategories dezactivează redenumirea pentru categorii folosite', () => {
  render(
    <MemoryRouter>
      <AdminCategories />
    </MemoryRouter>,
  );
  const row = screen.getByText('Suveniruri').closest('tr')!;
  const rename = row.querySelector('button')!;
  assert.equal(rename.disabled, true);
  assert.ok(screen.getAllByText(/Folosită de produse/).length >= 1);
});

it('AdminFairs arată perioada, starea și legăturile cu id-ul târgului', () => {
  fairsList = [
    {
      _id: 'fair-1',
      _creationTime: 1,
      name: 'Târg Crăciun',
      active: true,
      createdBy: 'admin-1',
      startsOn: '2099-12-01',
      endsOn: '2099-12-24',
    },
  ];
  render(
    <MemoryRouter>
      <AdminFairs />
    </MemoryRouter>,
  );
  assert.ok(screen.getByText(/Planificat/));
  assert.ok(screen.getByText(/2099-12-01/));
  assert.ok(
    screen.getByText('Locație de inventar: stocul propriu al târgului'),
  );
  assert.equal(
    screen.getByRole('link', { name: 'Deschide POS' }).getAttribute('href'),
    '/admin/pos?fairId=fair-1',
  );
  assert.equal(
    screen.getByRole('link', { name: 'Stoc' }).getAttribute('href'),
    '/admin/inventory?fairId=fair-1',
  );
  assert.equal(
    screen.getByRole('link', { name: 'Transferuri' }).getAttribute('href'),
    '/admin/transfers?location=fair-1',
  );
  assert.equal(
    screen.getByRole('link', { name: 'Transfer nou' }).getAttribute('href'),
    '/admin/transfers/new?from=workshop&to=fair-1',
  );
});

it('PointOfSale preselectează târgul din ?fairId=', async () => {
  fairsList = [
    fair as unknown as Record<string, unknown>,
    {
      _id: 'fair-2',
      _creationTime: 1,
      name: 'Târg Vară',
      active: true,
      createdBy: 'admin-1',
    },
  ];
  render(
    <MemoryRouter initialEntries={['/admin/pos?fairId=fair-2']}>
      <PointOfSale />
    </MemoryRouter>,
  );
  const select = (await screen.findByLabelText(
    'Targul selectat',
  )) as HTMLSelectElement;
  assert.equal(select.value, 'fair-2');
});

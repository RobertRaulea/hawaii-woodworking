import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { getFunctionName } from 'convex/server';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import {
  filterStockRows,
  locationStock,
} from '../../src/utils/inventory.utils';
import type { InventoryProduct } from '../../src/types/inventory.types';
import type {
  NewStockOperationRequest,
  StockOperationController,
} from '../../src/types/inventory.types';
import { fair, product } from './fixtures';

const queryMock = mock.fn<(reference: unknown, args?: unknown) => unknown>(
  () => undefined,
);
const mutation = mock.fn<
  (reference: unknown, args: unknown) => Promise<unknown>
>(async () => ({}));
const convexQuery = mock.fn<(reference: unknown, args: unknown) => unknown>(
  async () => null,
);
const convexClient = { query: convexQuery, mutation };

mock.module('convex/react', {
  namedExports: {
    useQuery: queryMock,
    useMutation: () => mutation,
    useConvex: () => convexClient,
    usePaginatedQuery: () => ({
      results: [],
      status: 'Exhausted',
      loadMore: () => {},
    }),
    useQueries: () => ({}),
    useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
    useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  },
});

const { useStockOperation } =
  await import('../../src/hooks/useStockOperation.ts');
const { StockOperationDialog } =
  await import('../../src/pages/Admin/Inventory/StockOperationDialog.tsx');
const { AssignedFairStock } =
  await import('../../src/pages/Admin/Inventory/AssignedFairStock.tsx');
const { ProductForm } =
  await import('../../src/pages/Admin/Products/ProductForm.tsx');

const stockOperationMock = (
  overrides: Partial<StockOperationController> = {},
): StockOperationController => ({
  pending: null,
  completed: null,
  busy: false,
  online: true,
  blocked: false,
  error: '',
  start: mock.fn<(request: NewStockOperationRequest) => Promise<void>>(
    async () => {},
  ),
  retry: mock.fn(async () => {}),
  dismissCompleted: mock.fn(() => {}),
  ...overrides,
});

const row = (overrides: Partial<InventoryProduct>): InventoryProduct => ({
  ...product,
  ...overrides,
});

it('locationStock returnează valori pe locație și rezistă la date lipsă', () => {
  const invalid = row({ invalidStock: true });
  assert.deepEqual(locationStock(invalid, 'all'), {
    physical: null,
    reserved: null,
    available: null,
  });
  assert.deepEqual(locationStock(product, 'workshop'), {
    physical: 100,
    reserved: 0,
    available: 100,
  });
  assert.deepEqual(locationStock(product, 'all'), {
    physical: 134,
    reserved: 0,
    available: 134,
  });
  assert.deepEqual(locationStock(product, `fairs:${fair._id}`), {
    physical: 34,
    reserved: 0,
    available: 34,
  });
  const sellerRow = row({
    onlineStock: null,
    onlinePhysicalStock: null,
    onlineHeldOrders: null,
    totalStock: null,
  });
  assert.deepEqual(locationStock(sellerRow, 'all'), {
    physical: null,
    reserved: null,
    available: null,
  });
});

it('filterStockRows filtrează după locație, categorie, căutare și disponibilitate', () => {
  const low = row({
    id: 'low' as never,
    name: 'Cutie',
    sku: 'CUT-1',
    onlineStock: 3,
    onlinePhysicalStock: 3,
    lowStockThreshold: 5,
    fairs: [],
  });
  const reserved = row({
    id: 'held' as never,
    name: 'Tabou',
    sku: 'TAB-1',
    onlineStock: 0,
    onlinePhysicalStock: 4,
    onlineHeldOrders: 4,
    fairs: [],
  });
  const empty = row({
    id: 'empty' as never,
    name: 'Gone',
    sku: '',
    category: 'Altele',
    onlineStock: 0,
    onlinePhysicalStock: 0,
    fairs: [],
  });
  const all = [product, low, reserved, empty];
  const base = { term: '', location: 'all' as const, category: '', availability: 'all' as const };
  assert.equal(filterStockRows(all, base).length, 4);
  assert.deepEqual(
    filterStockRows(all, { ...base, term: 'mag-01' }).map((p) => p.id),
    [product.id],
  );
  assert.deepEqual(
    filterStockRows(all, { ...base, category: 'Altele' }).map((p) => p.id),
    ['empty'],
  );
  assert.deepEqual(
    filterStockRows(all, { ...base, location: `fairs:${fair._id}` }).map(
      (p) => p.id,
    ),
    [product.id],
  );
  assert.deepEqual(
    filterStockRows(all, { ...base, availability: 'out' }).map((p) => p.id)
      .sort(),
    ['empty', 'held'],
  );
  assert.deepEqual(
    filterStockRows(all, { ...base, availability: 'reserved' }).map(
      (p) => p.id,
    ),
    ['held'],
  );
  assert.deepEqual(
    filterStockRows(all, { ...base, availability: 'low' }).map((p) => p.id)
      .sort(),
    ['empty', 'held', 'low'],
  );
  assert.deepEqual(
    filterStockRows(all, { ...base, availability: 'available' }).map(
      (p) => p.id,
    ),
    [product.id, 'low'],
  );
});

const Harness = () => {
  const operation = useStockOperation('actor-1');
  return (
    <div>
      <button
        data-testid="start"
        onClick={() => {
          void operation.start({
            kind: 'receipt',
            productId: 'p1' as never,
            quantity: 2,
          });
          void operation.start({
            kind: 'receipt',
            productId: 'p1' as never,
            quantity: 2,
          });
        }}
      >
        start
      </button>
      <button data-testid="retry" onClick={() => void operation.retry()}>
        retry
      </button>
      <span data-testid="error">{operation.error}</span>
    </div>
  );
};

it('ignoră submiturile re-entrant și reia cu același requestId după eroare de rețea', async () => {
  const user = userEvent.setup();
  mutation.mock.resetCalls();
  mutation.mock.mockImplementation(async () => ({}));
  render(<Harness />);
  await user.click(screen.getByTestId('start'));
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));

  mutation.mock.resetCalls();
  let failOnce = true;
  mutation.mock.mockImplementation(async () => {
    if (failOnce) {
      failOnce = false;
      throw new Error('network down');
    }
    return { _id: 'op-1' };
  });
  render(<Harness />);
  const buttons = screen.getAllByTestId('start');
  await user.click(buttons[buttons.length - 1]);
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  const firstRequestId = (
    mutation.mock.calls[0].arguments[1] as { requestId: string }
  ).requestId;
  const retries = screen.getAllByTestId('retry');
  await user.click(retries[retries.length - 1]);
  await waitFor(() => assert.equal(mutation.mock.callCount(), 2));
  assert.equal(
    (mutation.mock.calls[1].arguments[1] as { requestId: string }).requestId,
    firstRequestId,
  );
});

it('ajustarea fără notă afișează validarea și nu trimite nimic', async () => {
  const start = mock.fn<(request: NewStockOperationRequest) => Promise<void>>(
    async () => {},
  );
  const operation = stockOperationMock({ start });
  const user = userEvent.setup();
  render(
    <StockOperationDialog
      product={product}
      fairs={[fair]}
      operation={operation}
      onClose={() => {}}
    />,
  );
  await user.selectOptions(screen.getByLabelText('Operațiune'), 'adjustment');
  await user.type(screen.getByLabelText('Diferență (+/−)'), '-2');
  await user.click(screen.getByRole('button', { name: 'Confirmă' }));
  await screen.findByText(/Nota este obligatorie/);
  assert.equal(start.mock.callCount(), 0);
});

it('inventarierea încarcă instantaneul și Revalidează îl reîncarcă la conflict', async () => {
  convexQuery.mock.resetCalls();
  convexQuery.mock.mockImplementation(async () => ({
    expectedQuantity: 5,
    lastMovementId: 'move-1',
    held: 0,
    posSaleInProgress: false,
  }));
  const operation = stockOperationMock({
    error:
      'Stocul s-a modificat după începerea numărării. Revalidează numărătoarea.',
  });
  const user = userEvent.setup();
  render(
    <StockOperationDialog
      product={product}
      fairs={[fair]}
      operation={operation}
      onClose={() => {}}
    />,
  );
  await user.selectOptions(screen.getByLabelText('Operațiune'), 'count');
  await waitFor(() => assert.equal(convexQuery.mock.callCount(), 1));
  assert.equal(
    getFunctionName(convexQuery.mock.calls[0].arguments[0] as never),
    'inventory:countSnapshot',
  );
  const revalidate = await screen.findByRole('button', { name: 'Revalidează' });
  await user.click(revalidate);
  await waitFor(() => assert.equal(convexQuery.mock.callCount(), 2));
});

it('vânzătorul nu are butoane de operațiuni și istoricul cere un târg', () => {
  render(
    <MemoryRouter>
      <AssignedFairStock
        overview={{ scope: 'assigned', fairs: [], products: [product] }}
      />
    </MemoryRouter>,
  );
  assert.ok(screen.getByText(/Nu ai târguri active alocate/));
  assert.equal(screen.queryByRole('button', { name: 'Stoc' }), null);
  assert.equal(screen.queryByRole('button', { name: 'Transfer' }), null);
  assert.equal(screen.queryByText('Istoric mișcări de stoc'), null);
});

it('formularul de produs nu mai are câmp de stoc editabil', () => {
  queryMock.mock.resetCalls();
  queryMock.mock.mockImplementation((reference) =>
    getFunctionName(reference as never) === 'categories:getAll' ? [] : undefined,
  );
  render(
    <MemoryRouter>
      <ProductForm />
    </MemoryRouter>,
  );
  assert.equal(document.getElementById('stock'), null);
  assert.equal(screen.queryByLabelText('Stoc disponibil online'), null);
  assert.ok(screen.getByText(/Stocul se gestionează din/));
});

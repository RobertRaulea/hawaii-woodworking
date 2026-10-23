import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getFunctionName } from 'convex/server';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import { fair, product, operationMock } from './fixtures';
import type { Id } from '../../convex/_generated/dataModel';

const staffAdmin = { role: 'admin', userId: 'admin-1', homePath: '/admin' };
const staffSeller = { role: 'seller', userId: 'seller-1', homePath: '/admin' };

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
const adminQuery = mock.fn<(query: unknown, args: unknown) => unknown>(() => ({
  data: null,
  error: null,
}));

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
    useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
    useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  },
});

mock.module(new URL('../../src/hooks/useAdminQuery.ts', import.meta.url).href, {
  namedExports: { useAdminQuery: adminQuery },
});
mock.module(
  new URL('../../src/hooks/useInventoryOperation.ts', import.meta.url).href,
  { namedExports: { useInventoryOperation: () => operationMock() } },
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

const TransferList = (
  await import('../../src/pages/Admin/Transfers/TransferList.tsx')
).default;
const TransferForm = (
  await import('../../src/pages/Admin/Transfers/TransferForm.tsx')
).default;
const TransferDetail = (
  await import('../../src/pages/Admin/Transfers/TransferDetail.tsx')
).default;
const { AdminInventory } =
  await import('../../src/pages/Admin/Inventory/AdminInventory.tsx');

const transferId = 'transfers-1' as Id<'transfers'>;

const draftSummary = (overrides = {}) => ({
  _id: transferId,
  _creationTime: 1,
  status: 'draft',
  createdBy: 'admin-1',
  createdAt: 1,
  updatedAt: 1,
  fromLocation: 'workshop',
  toLocation: 'fair',
  toFairId: fair._id,
  lines: [
    {
      productId: product.id,
      productName: product.name,
      quantity: 5,
      shippedQuantity: 0,
      receivedQuantity: 0,
    },
  ],
  fromName: 'Atelier',
  toName: fair.name,
  lineCount: 1,
  totalUnits: 5,
  inTransitUnits: 0,
  ...overrides,
});

const inTransitDetail = () => ({
  transfer: draftSummary({
    status: 'in_transit',
    lines: [
      {
        productId: product.id,
        productName: product.name,
        quantity: 5,
        shippedQuantity: 5,
        receivedQuantity: 2,
      },
    ],
    inTransitUnits: 3,
    shippedAt: 2,
    shippedBy: 'admin-1',
  }),
  events: [
    {
      _id: 'e1' as never,
      _creationTime: 1,
      transferId,
      requestId: 'r1',
      actorId: 'admin-1',
      kind: 'created',
      createdAt: 1,
    },
    {
      _id: 'e2' as never,
      _creationTime: 2,
      transferId,
      requestId: 'r2',
      actorId: 'admin-1',
      kind: 'shipped',
      createdAt: 2,
      lines: [{ productId: product.id, quantity: 5 }],
    },
  ],
});

const mockQueries = (
  detail: unknown,
  transfers: unknown[] = [],
  staff: unknown = staffAdmin,
) => {
  queryMock.mock.resetCalls();
  queryMock.mock.mockImplementation((reference, args) => {
    switch (getFunctionName(reference as never)) {
      case 'staff:me':
        return staff;
      case 'pos:getStockOverview':
        return {
          scope: 'all',
          issues: [],
          fairs: [fair],
          products: [product],
        };
      case 'transfers:list':
        return transfers;
      case 'transfers:get':
        return detail;
      case 'products:getAll':
        return [
          {
            _id: product.id,
            name: product.name,
            name_ro: product.name,
            trackStock: true,
          },
        ];
      default:
        return undefined;
    }
    void args;
  });
};

it('lista filtrează după stare și locație', async () => {
  const user = userEvent.setup();
  mockQueries(undefined, [draftSummary()]);
  render(
    <MemoryRouter>
      <TransferList />
    </MemoryRouter>,
  );
  await screen.findByText('Transfer nou');
  const listCalls = () =>
    queryMock.mock.calls.filter(
      (call) => getFunctionName(call.arguments[0] as never) === 'transfers:list',
    );
  assert.equal(listCalls().length >= 1, true);
  await user.selectOptions(screen.getByLabelText('Stare'), 'in_transit');
  await waitFor(() =>
    assert.equal(
      (listCalls().at(-1)?.arguments[1] as { status?: string }).status,
      'in_transit',
    ),
  );
  await user.selectOptions(
    screen.getByLabelText('Locație'),
    String(fair._id),
  );
  await waitFor(() =>
    assert.equal(
      (listCalls().at(-1)?.arguments[1] as { fairId?: string }).fairId,
      String(fair._id),
    ),
  );
});

it('vânzătorul vede doar Solicită reaprovizionare și nicio acțiune de execuție', async () => {
  mockQueries(
    {
      transfer: draftSummary({
        status: 'requested',
        createdBy: 'seller-1',
        fromLocation: undefined,
        fromName: null,
        lines: [
          {
            productId: product.id,
            productName: product.name,
            requestedQuantity: 5,
            quantity: 5,
            shippedQuantity: 0,
            receivedQuantity: 0,
          },
        ],
      }),
      events: [],
    },
    [draftSummary({ status: 'requested', createdBy: 'seller-1' })],
    staffSeller,
  );
  render(
    <MemoryRouter>
      <TransferList />
    </MemoryRouter>,
  );
  await screen.findByText('Solicită reaprovizionare');
  assert.equal(screen.queryByText('Transfer nou'), null);
});

it('formularul adaugă și elimină produse și blochează aceeași sursă/destinație', async () => {
  const user = userEvent.setup();
  mockQueries(undefined);
  render(
    <MemoryRouter>
      <TransferForm />
    </MemoryRouter>,
  );
  await screen.findByLabelText('Destinație');
  await user.click(screen.getByRole('button', { name: /Adaugă produs/ }));
  const qtyInputs = screen.getAllByLabelText('Cantitate');
  assert.equal(qtyInputs.length, 2);
  await user.click(
    screen.getAllByRole('button', { name: 'Șterge produsul' })[1],
  );
  assert.equal(screen.getAllByLabelText('Cantitate').length, 1);

  await user.selectOptions(screen.getByLabelText('Sursă'), 'workshop');
  await user.selectOptions(
    screen.getByLabelText('Destinație'),
    'workshop',
  );
  const productInput = screen.getByRole('combobox', { name: /Produs/ });
  await user.click(productInput);
  await user.click(await screen.findByText(product.name));
  mutation.mock.resetCalls();
  await user.click(
    screen.getByRole('button', { name: 'Creează transferul' }),
  );
  await screen.findByText(/trebuie să difere/);
  assert.equal(mutation.mock.callCount(), 0);
});

it('dialogul de recepție preia cantitățile rămase și trimite recepție parțială', async () => {
  const user = userEvent.setup();
  mockQueries(inTransitDetail());
  convexQuery.mock.mockImplementation(async () => ({
    kind: 'received',
    transferId,
    requestId: 'r3',
    actorId: 'admin-1',
    createdAt: 3,
  }));
  render(
    <MemoryRouter initialEntries={[`/admin/transfers/${transferId}`]}>
      <Routes>
        <Route path="/admin/transfers/:id" element={<TransferDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await user.click(
    await screen.findByRole('button', { name: 'Recepționează' }),
  );
  const qty = await screen.findByLabelText(`Cantitate ${product.name}`);
  assert.equal((qty as HTMLInputElement).value, '3');
  await user.clear(qty);
  await user.type(qty, '1');
  mutation.mock.resetCalls();
  await user.click(
    screen.getByRole('button', { name: 'Confirmă recepția' }),
  );
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  assert.equal(
    getFunctionName(mutation.mock.calls[0].arguments[0] as never),
    'transfers:receive',
  );
  const args = mutation.mock.calls[0].arguments[1] as {
    transferId: string;
    lines: { productId: string; quantity: number }[];
  };
  assert.equal(args.transferId, String(transferId));
  assert.deepEqual(args.lines, [{ productId: product.id, quantity: 1 }]);
});

it('vânzătorul poate recepționa propriul transfer expediat', async () => {
  const detail = inTransitDetail();
  detail.transfer.createdBy = 'seller-1';
  mockQueries(detail, [], staffSeller);
  render(
    <MemoryRouter initialEntries={[`/admin/transfers/${transferId}`]}>
      <Routes>
        <Route path="/admin/transfers/:id" element={<TransferDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: 'Recepționează' });
  assert.equal(screen.queryByRole('button', { name: 'Expediază' }), null);
});

it('o a doua recepție parțială pornește fără refresh', async () => {
  const user = userEvent.setup();
  mockQueries(inTransitDetail());
  convexQuery.mock.mockImplementation(async () => ({
    kind: 'received',
    transferId,
    requestId: 'r-recv',
    actorId: 'admin-1',
    createdAt: 3,
  }));
  mutation.mock.resetCalls();
  mutation.mock.mockImplementation(async () => ({}));
  render(
    <MemoryRouter initialEntries={[`/admin/transfers/${transferId}`]}>
      <Routes>
        <Route path="/admin/transfers/:id" element={<TransferDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await user.click(
    await screen.findByRole('button', { name: 'Recepționează' }),
  );
  const qty = await screen.findByLabelText(`Cantitate ${product.name}`);
  await user.clear(qty);
  await user.type(qty, '1');
  await user.click(
    screen.getByRole('button', { name: 'Confirmă recepția' }),
  );
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  const firstRequestId = (
    mutation.mock.calls[0].arguments[1] as { requestId: string }
  ).requestId;

  await user.click(
    await screen.findByRole('button', { name: 'Recepționează' }),
  );
  const qty2 = await screen.findByLabelText(`Cantitate ${product.name}`);
  await user.clear(qty2);
  await user.type(qty2, '2');
  await user.click(
    screen.getByRole('button', { name: 'Confirmă recepția' }),
  );
  await waitFor(() => assert.equal(mutation.mock.callCount(), 2));
  const second = mutation.mock.calls[1].arguments[1] as {
    requestId: string;
    lines: { quantity: number }[];
  };
  assert.notEqual(second.requestId, firstRequestId);
  assert.equal(second.lines[0].quantity, 2);
});

it('vânzătorul nu vede butonul de recepție pe transferul altcuiva', async () => {
  mockQueries(inTransitDetail(), [], staffSeller);
  render(
    <MemoryRouter initialEntries={[`/admin/transfers/${transferId}`]}>
      <Routes>
        <Route path="/admin/transfers/:id" element={<TransferDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText('Istoric operațiuni');
  assert.equal(
    screen.queryByRole('button', { name: 'Recepționează' }),
    null,
  );
});

it('adminul acceptă solicitarea dintr-un clic, după confirmare', async () => {
  const user = userEvent.setup();
  mockQueries({
    transfer: draftSummary({
      status: 'requested',
      createdBy: 'seller-1',
      fromLocation: undefined,
      fromName: null,
      lines: [
        {
          productId: product.id,
          productName: product.name,
          requestedQuantity: 5,
          quantity: 5,
          shippedQuantity: 0,
          receivedQuantity: 0,
        },
      ],
    }),
    events: [],
  });
  convexQuery.mock.mockImplementation(async () => ({
    kind: 'accepted',
    transferId,
    requestId: 'r6',
    actorId: 'admin-1',
    createdAt: 6,
  }));
  mutation.mock.resetCalls();
  mutation.mock.mockImplementation(async () => ({}));
  render(
    <MemoryRouter initialEntries={[`/admin/transfers/${transferId}`]}>
      <Routes>
        <Route path="/admin/transfers/:id" element={<TransferDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole('button', { name: 'Acceptă' }));
  const confirm = await screen.findAllByRole('button', { name: 'Acceptă' });
  await user.click(confirm[confirm.length - 1]);
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  assert.equal(
    getFunctionName(mutation.mock.calls[0].arguments[0] as never),
    'transfers:accept',
  );
  const args = mutation.mock.calls[0].arguments[1] as { transferId: string };
  assert.equal(args.transferId, String(transferId));
});

it('vânzătorul nu vede butonul Acceptă pe propria solicitare', async () => {
  mockQueries(
    {
      transfer: draftSummary({
        status: 'requested',
        createdBy: 'seller-1',
        fromLocation: undefined,
        fromName: null,
      }),
      events: [],
    },
    [],
    staffSeller,
  );
  render(
    <MemoryRouter initialEntries={[`/admin/transfers/${transferId}`]}>
      <Routes>
        <Route path="/admin/transfers/:id" element={<TransferDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText(/așteaptă aprobarea/);
  assert.equal(screen.queryByRole('button', { name: 'Acceptă' }), null);
  assert.equal(screen.queryByRole('link', { name: 'Editează' }), null);
});

it('dublu clic pe Expediază declanșează o singură mutație', async () => {
  const user = userEvent.setup();
  mockQueries({ transfer: draftSummary(), events: [] });
  convexQuery.mock.mockImplementation(async () => ({
    kind: 'shipped',
    transferId,
    requestId: 'r4',
    actorId: 'admin-1',
    createdAt: 4,
  }));
  let resolveMutation: ((value: unknown) => void) | undefined;
  mutation.mock.resetCalls();
  mutation.mock.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveMutation = resolve;
      }),
  );
  render(
    <MemoryRouter initialEntries={[`/admin/transfers/${transferId}`]}>
      <Routes>
        <Route path="/admin/transfers/:id" element={<TransferDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await user.click(
    await screen.findByRole('button', { name: 'Expediază' }),
  );
  const confirm = await screen.findAllByRole('button', { name: 'Expediază' });
  await user.click(confirm[confirm.length - 1]);
  await user.click(confirm[confirm.length - 1]);
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  assert.equal(
    getFunctionName(mutation.mock.calls[0].arguments[0] as never),
    'transfers:ship',
  );
  resolveMutation?.(draftSummary({ status: 'in_transit' }));
});

it('eroare de rețea apoi Reîncearcă reutilizează același requestId', async () => {
  const user = userEvent.setup();
  mockQueries({ transfer: draftSummary(), events: [] });
  localStorage.clear();
  let failOnce = true;
  mutation.mock.resetCalls();
  mutation.mock.mockImplementation(async () => {
    if (failOnce) {
      failOnce = false;
      throw new Error('network down');
    }
    return draftSummary({ status: 'in_transit' });
  });
  convexQuery.mock.mockImplementation(async () => ({
    kind: 'shipped',
    transferId,
    requestId: 'r5',
    actorId: 'admin-1',
    createdAt: 5,
  }));
  render(
    <MemoryRouter initialEntries={[`/admin/transfers/${transferId}`]}>
      <Routes>
        <Route path="/admin/transfers/:id" element={<TransferDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await user.click(
    await screen.findByRole('button', { name: 'Expediază' }),
  );
  const confirm = await screen.findAllByRole('button', { name: 'Expediază' });
  await user.click(confirm[confirm.length - 1]);
  const retry = await screen.findByRole('button', { name: 'Reîncearcă' });
  await waitFor(() => assert.equal(mutation.mock.callCount(), 1));
  const firstRequestId = (
    mutation.mock.calls[0].arguments[1] as { requestId: string }
  ).requestId;
  await user.click(retry);
  await waitFor(() => assert.equal(mutation.mock.callCount(), 2));
  assert.equal(
    (mutation.mock.calls[1].arguments[1] as { requestId: string }).requestId,
    firstRequestId,
  );
});

it('butonul Transfer din Stocuri duce la transfer nou cu productId și from', async () => {
  mockQueries(undefined);
  adminQuery.mock.mockImplementation(() => ({
    data: { fairs: [fair], products: [product], issues: [] },
    error: null,
  }));
  render(
    <MemoryRouter>
      <AdminInventory />
    </MemoryRouter>,
  );
  const link = await screen.findByRole('link', { name: 'Transfer' });
  const href = link.getAttribute('href') ?? '';
  assert.match(href, /\/admin\/transfers\/new/);
  assert.match(href, new RegExp(`productId=${product.id}`));
  assert.match(href, /from=workshop/);
});

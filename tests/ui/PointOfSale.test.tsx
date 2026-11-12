import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { getFunctionName } from 'convex/server';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import type { Id } from '../../convex/_generated/dataModel';
import type { PaymentMethod } from '../../src/pages/Admin/PointOfSale/pos.types';
import type { usePosPayment } from '../../src/pages/Admin/PointOfSale/usePosPayment';
import { fair, product } from './fixtures';

const query = mock.fn<
  (reference: Parameters<typeof getFunctionName>[0], args?: unknown) => unknown
>(() => undefined);
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
  namedExports: { useQuery: query, useQueries: () => ({}) },
});
mock.module(
  new URL('../../src/pages/Admin/PointOfSale/usePosPayment.ts', import.meta.url)
    .href,
  { namedExports: { usePosPayment: () => payment } },
);
mock.module(
  new URL('../../src/hooks/useProductThumbnails.ts', import.meta.url).href,
  { namedExports: { useProductThumbnails: () => new Map() } },
);
const { PointOfSale } =
  await import('../../src/pages/Admin/PointOfSale/PointOfSale.tsx');
const { PaymentDialog } = await import(
  '../../src/pages/Admin/PointOfSale/PaymentDialog.tsx'
);

let activeFairs = [fair];
beforeEach(() => {
  activeFairs = [fair];
  query.mock.mockImplementation((reference, args) => {
    if (args === 'skip') return undefined;
    const name = getFunctionName(reference);
    if (name === 'pos:listFairs') return activeFairs;
    if (name === 'pos:workspace')
      return [
        {
          ...product,
          stock: 34,
          onlineStock: 100,
          workshopStock: 100,
          unitPriceCents: 2500,
          image: '',
        },
      ];
    return { count: 0, units: 0, totalCents: 0, cashCents: 0, cardCents: 0 };
  });
});

it('nu mai arată configurare sau transferuri pe ecranul de vânzare', () => {
  render(
    <MemoryRouter>
      <PointOfSale />
    </MemoryRouter>,
  );
  assert.equal(
    screen.queryByRole('button', { name: /Stoc si configurare/ }),
    null,
  );
  assert.equal(screen.queryByText('Un nou punct de vanzare'), null);
  assert.ok(screen.getByRole('heading', { name: 'Comanda curenta' }));
});

it('fără târguri active oferă doar legătura spre administrare', () => {
  activeFairs = [];
  render(
    <MemoryRouter>
      <PointOfSale />
    </MemoryRouter>,
  );
  assert.equal(
    screen
      .getByRole('link', { name: 'Administrează târgurile' })
      .getAttribute('href'),
    '/admin/fairs',
  );
  assert.equal(screen.queryByRole('button', { name: /Creeaza|Creează/ }), null);
});

it('arhivarea din altă sesiune blochează plata fără a muta coșul', async () => {
  const view = render(
    <MemoryRouter>
      <PointOfSale />
    </MemoryRouter>,
  );
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: /Adauga Magnet Sibiu/ }));
  activeFairs = [];
  view.rerender(
    <MemoryRouter>
      <PointOfSale />
    </MemoryRouter>,
  );
  assert.ok(
    screen.getByRole('alert').textContent?.includes('selecția nu este mutată'),
  );
  assert.equal(
    screen
      .getByRole('button', { name: 'Incaseaza CASH' })
      .hasAttribute('disabled'),
    true,
  );
  assert.ok(screen.getByText('1 bucati selectate'));
});

const dialogPayment = (
  method: PaymentMethod,
): ReturnType<typeof usePosPayment> => ({
  pending: {
    args: {
      requestId: 'request-ui-split-0001',
      fairId: 'fair-1' as Id<'fairs'>,
      paymentMethod: method,
      discountCents: 0,
      discountReason: '',
      items: [
        {
          productId: 'magnet' as Id<'products'>,
          quantity: 2,
          expectedUnitPriceCents: 2500,
        },
      ],
    },
    phase: 'prepared' as const,
  },
  attempt: {
    _id: 'attempt-1' as Id<'posAttempts'>,
    _creationTime: 0,
    requestId: 'request-ui-split-0001',
    sellerId: 'admin-1',
    fairId: 'fair-1' as Id<'fairs'>,
    paymentMethod: method,
    status: 'prepared' as const,
    items: [
      {
        productId: 'magnet' as Id<'products'>,
        name: 'Magnet Sibiu',
        quantity: 2,
        unitPriceCents: 2500,
      },
    ],
    subtotalCents: 5000,
    discountCents: 0,
    discountReason: '',
    totalCents: 5000,
  },
  completed: null,
  outstanding: [],
  blocked: true,
  busy: false,
  online: true,
  error: '',
  recovered: false,
  start: mock.fn<(args: unknown) => Promise<void>>(async () => {}),
  confirm: mock.fn<(received?: number, cash?: number) => Promise<void>>(
    async () => {},
  ),
  verify: mock.fn<() => Promise<void>>(async () => {}),
  abandon: mock.fn<() => Promise<void>>(async () => {}),
  restore: mock.fn(),
});

it('plata mixta leagă sumele cash și card și trimite partea cash exactă', async () => {
  const user = userEvent.setup();
  const confirm = mock.fn<(received?: number, cash?: number) => Promise<void>>(
    async () => {},
  );
  const split = { ...dialogPayment('split'), confirm };
  render(<PaymentDialog payment={split} />);
  const cashInput = screen.getByLabelText('Cash primit (lei)');
  const cardInput = screen.getByLabelText('Card (lei)');
  await user.type(cashInput, '30');
  assert.equal((cardInput as HTMLInputElement).value, '20.00');
  await user.clear(cashInput);
  assert.equal((cardInput as HTMLInputElement).value, '');
  await user.type(cardInput, '20');
  assert.equal((cashInput as HTMLInputElement).value, '30.00');
  assert.ok(screen.getByText(/Cash .*·.* Card/).textContent?.includes('30'));
  await user.click(
    screen.getByRole('button', {
      name: 'Cash primit + terminal aprobat · Confirma plata',
    }),
  );
  await waitFor(() => assert.equal(confirm.mock.calls.length, 1));
  assert.deepEqual(confirm.mock.calls[0].arguments, [undefined, 3000]);
});

it('plata mixta respinge părțile zero, negative sau care acoperă totalul', async () => {
  const user = userEvent.setup();
  const confirm = mock.fn<(received?: number, cash?: number) => Promise<void>>(
    async () => {},
  );
  const split = { ...dialogPayment('split'), confirm };
  render(<PaymentDialog payment={split} />);
  const cashInput = screen.getByLabelText('Cash primit (lei)');
  const submit = screen.getByRole('button', { name: /Confirma plata/ });
  await user.type(cashInput, '0');
  await user.click(submit);
  assert.ok(await screen.findByText(/Suma cash trebuie/));
  assert.equal(confirm.mock.calls.length, 0);
  await user.clear(cashInput);
  await user.type(cashInput, '50');
  await user.click(submit);
  assert.ok(await screen.findByText(/Suma cash trebuie/));
  assert.equal(confirm.mock.calls.length, 0);
});

it('dialogul de plată se redeschide dacă browserul îl închide forțat', async () => {
  render(<PaymentDialog payment={dialogPayment('card')} />);
  const element = document.querySelector('dialog');
  assert.ok(element);
  assert.equal(element.open, true);
  // Chromium closes the modal on a second Esc even when `cancel` is prevented.
  element.open = false;
  element.dispatchEvent(new Event('close'));
  assert.equal(element.open, true);
  assert.ok(
    screen.getByRole('button', { name: /Inapoi la cos/ }),
  );
});

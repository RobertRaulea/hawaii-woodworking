import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { getFunctionName } from 'convex/server';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
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
const { PointOfSale } =
  await import('../../src/pages/Admin/PointOfSale/PointOfSale.tsx');

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

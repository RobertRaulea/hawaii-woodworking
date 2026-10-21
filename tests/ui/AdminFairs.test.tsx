import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import { fair, operationMock } from './fixtures';

const query = mock.fn<(query: unknown, args: unknown) => unknown>(() => ({}));
let operation = operationMock();
const create = mock.fn<(args: { name: string }) => Promise<string>>(
  async () => 'new-fair',
);
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
mock.module('convex/react', { namedExports: { useMutation: () => create } });
const { AdminFairs } =
  await import('../../src/pages/Admin/Fairs/AdminFairs.tsx');

beforeEach(() => {
  query.mock.mockImplementation(() => ({
    data: [
      fair,
      { ...fair, _id: 'old-fair', name: 'Târg vechi', active: false },
    ],
    error: null,
  }));
  operation = operationMock();
  create.mock.resetCalls();
});

it('păstrează formularul rar folosit ascuns până la Adaugă târg', async () => {
  render(
    <MemoryRouter>
      <AdminFairs />
    </MemoryRouter>,
  );
  assert.equal(screen.queryByLabelText('Numele târgului'), null);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Adaugă târg' }));
  await user.type(screen.getByLabelText('Numele târgului'), 'Târg Sibiu');
  await user.click(screen.getByRole('button', { name: 'Creează târg' }));
  assert.deepEqual(create.mock.calls[0].arguments[0], { name: 'Târg Sibiu' });
  assert.ok(await screen.findByRole('status'));
});

it('separă lista arhivată fără a oferi ștergere', async () => {
  render(
    <MemoryRouter>
      <AdminFairs />
    </MemoryRouter>,
  );
  assert.equal(screen.queryByText('Târg vechi'), null);
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: /Arhivate/ }));
  assert.ok(screen.getByText('Târg vechi'));
  assert.equal(screen.queryByRole('button', { name: /Arhivează/ }), null);
});

it('arată o eroare de încărcare fără pagină albă', () => {
  query.mock.mockImplementation(() => ({
    data: undefined,
    error: 'Backend indisponibil',
  }));
  render(
    <MemoryRouter>
      <AdminFairs />
    </MemoryRouter>,
  );
  assert.ok(screen.getByRole('heading', { name: 'Târguri' }));
  assert.equal(screen.getByRole('alert').textContent, 'Backend indisponibil');
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getFunctionName } from 'convex/server';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import { hasPermission } from '../../convex/lib/permissions';
import type { StaffRole } from '../../convex/lib/permissions';

let role: StaffRole | null = 'admin';
let pending: number | undefined = undefined;
const convexQuery = mock.fn<(reference: unknown, args?: unknown) => unknown>(
  (reference, args) => {
    if (args === 'skip') return undefined;
    if (getFunctionName(reference as never) === 'transfers:pendingRequestCount')
      return pending;
    return undefined;
  },
);

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
        homePath: null,
        can: (permission: Parameters<typeof hasPermission>[1]) =>
          hasPermission(role, permission),
      }),
    },
  },
);
mock.module('convex/react', {
  namedExports: {
    useQuery: convexQuery,
    useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  },
});

const { AdminLayout } = await import('../../src/pages/Admin/AdminLayout.tsx');

const renderLayout = (path = '/admin/dashboard') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<h1>PAGINA PANOU</h1>} />
          <Route path="inventory" element={<h1>PAGINA STOCURI</h1>} />
          <Route path="transfers" element={<h1>PAGINA TRANSFERURI</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const linkLabels = (scope: HTMLElement) =>
  within(scope)
    .getAllByRole('link')
    .map((link) => link.textContent?.trim());

beforeEach(() => {
  role = 'admin';
  pending = undefined;
});

it('desktop sidebar lists only the items the role can access', () => {
  role = 'atelier';
  renderLayout('/admin/inventory');
  const nav = screen.getByRole('navigation', {
    name: 'Navigare administrare',
  });
  const labels = linkLabels(nav);
  assert.ok(labels.some((label) => label?.includes('Stocuri')));
  assert.ok(labels.some((label) => label?.includes('Pregătire comenzi')));
  for (const denied of ['Produse', 'Rapoarte', 'Clienți', 'Echipă', 'Vânzări'])
    assert.ok(!labels.some((label) => label?.includes(denied)), denied);
});

it('shows the pending transfer count badge with its accessible label', () => {
  pending = 3;
  renderLayout();
  const badge = screen.getByLabelText('3 solicitări de transfer în așteptare');
  assert.equal(badge.textContent, '3');
  assert.ok(screen.getByRole('link', { name: /Transferuri/ }));
});

it('does not render the pending badge when the count is zero', () => {
  pending = 0;
  renderLayout();
  assert.equal(screen.queryByLabelText(/solicitări de transfer/), null);
});

it('mobile menu is closed until the hamburger is pressed', () => {
  renderLayout();
  assert.equal(screen.queryByRole('dialog'), null);
});

it('hamburger opens the sheet with the permission-filtered nav', async () => {
  const user = userEvent.setup();
  role = 'seller';
  renderLayout('/admin/inventory');
  await user.click(screen.getByRole('button', { name: 'Deschide meniul' }));

  const dialog = await screen.findByRole('dialog', { name: 'Operațiuni' });
  assert.ok(within(dialog).getByText('Înapoi la magazin'));
  const labels = linkLabels(dialog);
  assert.ok(labels.some((label) => label?.includes('Vânzări la târg')));
  assert.ok(labels.some((label) => label?.includes('Stocuri')));
  assert.ok(!labels.some((label) => label?.includes('Produse')));
});

it('the sheet shows the pending transfer badge for roles that can execute transfers', async () => {
  const user = userEvent.setup();
  role = 'admin';
  pending = 2;
  renderLayout();
  await user.click(screen.getByRole('button', { name: 'Deschide meniul' }));
  const dialog = await screen.findByRole('dialog', { name: 'Administrare' });
  assert.ok(
    within(dialog).getByLabelText('2 solicitări de transfer în așteptare'),
  );
});

it('clicking a nav link in the sheet navigates and closes it', async () => {
  const user = userEvent.setup();
  renderLayout('/admin/dashboard');
  await user.click(screen.getByRole('button', { name: 'Deschide meniul' }));
  const dialog = await screen.findByRole('dialog', { name: 'Administrare' });

  await user.click(within(dialog).getByRole('link', { name: /Stocuri/ }));

  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
  assert.ok(screen.getByText('PAGINA STOCURI'));
});

it('Escape closes the sheet', async () => {
  const user = userEvent.setup();
  renderLayout();
  await user.click(screen.getByRole('button', { name: 'Deschide meniul' }));
  await screen.findByRole('dialog');
  await user.keyboard('{Escape}');
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
});

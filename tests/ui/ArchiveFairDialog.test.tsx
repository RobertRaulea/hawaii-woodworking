import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import { fair, product, operationMock } from './fixtures';

const query = mock.fn<(query: unknown, args: unknown) => unknown>(() => ({}));
mock.module(new URL('../../src/hooks/useAdminQuery.ts', import.meta.url).href, {
  namedExports: { useAdminQuery: query },
});
const { ArchiveFairDialog } =
  await import('../../src/pages/Admin/Fairs/ArchiveFairDialog.tsx');

beforeEach(() => {
  query.mock.mockImplementation(() => ({
    data: {
      fair,
      pendingPayments: 0,
      tooLarge: false,
      items: [
        {
          productId: product.id,
          name: product.name,
          quantity: 34,
          onlineStock: 100,
          onlineAfter: 134,
          issue: null,
        },
      ],
    },
    error: null,
  }));
});

it('cere confirmarea listei înainte de arhivare și returnare', async () => {
  const operation = operationMock();
  render(
    <ArchiveFairDialog
      fairId={fair._id}
      operation={operation}
      onClose={() => {}}
    />,
  );
  assert.equal(operation.start.mock.callCount(), 0);
  assert.ok(screen.getByText('Magnet Sibiu'));
  await userEvent.setup().click(
    screen.getByRole('button', {
      name: 'Returnează stocul online și arhivează',
    }),
  );
  const { requestId, ...request } = operation.start.mock.calls[0].arguments[0];
  assert.ok(requestId);
  assert.deepEqual(request, {
    kind: 'archive',
    fairId: fair._id,
    expectedInventory: [{ productId: product.id, quantity: 34 }],
  });
});

it('anularea nu modifică stocul', async () => {
  const operation = operationMock();
  const close = mock.fn(() => {});
  render(
    <ArchiveFairDialog
      fairId={fair._id}
      operation={operation}
      onClose={close}
    />,
  );
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Închide dialogul' }));
  assert.equal(close.mock.callCount(), 1);
  assert.equal(operation.start.mock.callCount(), 0);
});

it('o plată neclarificată blochează arhivarea', () => {
  query.mock.mockImplementation(() => ({
    data: { fair, pendingPayments: 1, tooLarge: false, items: [] },
    error: null,
  }));
  render(
    <ArchiveFairDialog
      fairId={fair._id}
      operation={operationMock()}
      onClose={() => {}}
    />,
  );
  assert.equal(
    screen
      .getByRole('button', { name: 'Returnează stocul online și arhivează' })
      .hasAttribute('disabled'),
    true,
  );
  assert.match(screen.getByRole('alert').textContent ?? '', /plată|plăți/);
});

it('Escape nu abandonează o operațiune deja trimisă și neconfirmată', () => {
  const close = mock.fn(() => {});
  const operation = operationMock();
  render(
    <ArchiveFairDialog
      fairId={fair._id}
      operation={{
        ...operation,
        blocked: true,
        pending: {
          kind: 'archive',
          fairId: fair._id,
          requestId: 'pending-archive-000001',
          expectedInventory: [],
        },
      }}
      onClose={close}
    />,
  );
  fireEvent(
    screen.getByRole('dialog'),
    new Event('cancel', { cancelable: true }),
  );
  assert.equal(close.mock.callCount(), 0);
  assert.equal(
    screen
      .getByRole('button', { name: 'Închide dialogul' })
      .hasAttribute('disabled'),
    true,
  );
});

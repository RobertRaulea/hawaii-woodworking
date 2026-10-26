import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import type { Id } from '../../convex/_generated/dataModel';
import { productId } from './fixtures';

const reconcile = mock.fn<
  (args: { orderId: string }) => Promise<{ inventoryStatus: string }>
>(async () => ({
  inventoryStatus: 'applied',
}));
mock.module('convex/react', {
  namedExports: {
    useMutation: () => reconcile,
    useQueries: () => ({}),
    useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  },
});
const { OrderInventoryReview } =
  await import('../../src/pages/Admin/Orders/OrderInventoryReview.tsx');
const order = {
  _id: 'order-1' as Id<'orders'>,
  inventoryStatus: 'needs_review' as const,
  inventoryError: 'Stoc insuficient',
  items: [{ productId, name: 'Magnet Sibiu', quantity: 2, price: 25 }],
};
beforeEach(() => {
  reconcile.mock.resetCalls();
  reconcile.mock.mockImplementation(async () => ({
    inventoryStatus: 'applied',
  }));
});

it('nu reaplică stocul fără confirmarea administratorului', async () => {
  render(<OrderInventoryReview order={order} />);
  assert.ok(screen.getByText('Plată confirmată · Stoc de verificat'));
  assert.equal(reconcile.mock.callCount(), 0);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Reverifică și aplică stocul' }),
  );
  assert.ok(screen.getByText(/nu debitează clientul/));
  await user.click(
    screen.getByRole('button', { name: 'Aplică stocul comenzii plătite' }),
  );
  assert.equal(reconcile.mock.callCount(), 1);
  assert.deepEqual(reconcile.mock.calls[0].arguments[0], {
    orderId: 'order-1',
  });
});

it('o lipsă de stoc rămâne vizibilă și nu devine succes fals', async () => {
  reconcile.mock.mockImplementation(async () => ({
    inventoryStatus: 'needs_review',
  }));
  render(<OrderInventoryReview order={order} />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Reverifică și aplică stocul' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Aplică stocul comenzii plătite' }),
  );
  assert.ok(
    (await screen.findByRole('alert')).textContent?.includes(
      'nu este încă suficient',
    ),
  );
});

it('confirmarea enumeră numai cantitățile încă nealocate', async () => {
  render(
    <OrderInventoryReview
      order={{
        ...order,
        inventoryUnfulfilledItems: [
          { productId, name: 'Magnet Sibiu', quantity: 1 },
        ],
      }}
    />,
  );
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Reverifică și aplică stocul' }));
  assert.ok(screen.getByText('1 × Magnet Sibiu'));
  assert.equal(screen.queryByText('2 × Magnet Sibiu'), null);
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { StockTransferDialog } from '../../src/pages/Admin/Inventory/StockTransferDialog';
import { fair, product, operationMock } from './fixtures';
import { inventoryNotice } from '../../src/utils/inventory.utils';
import { receipt } from './fixtures';

describe('transferul de stoc', () => {
  it('trimite explicit produsul, cantitatea și sensul invers', async () => {
    const operation = operationMock();
    const user = userEvent.setup();
    render(
      <StockTransferDialog
        products={[product]}
        fairs={[fair]}
        initialProductId={product.id}
        initialFairId={fair._id}
        operation={operation}
        onClose={() => {}}
      />,
    );
    await user.selectOptions(
      screen.getByLabelText('Direcția transferului'),
      'to_online',
    );
    await user.clear(screen.getByLabelText('Cantitate'));
    await user.type(screen.getByLabelText('Cantitate'), '3');
    await user.click(
      screen.getByRole('button', { name: 'Confirmă transferul' }),
    );
    const { requestId, ...request } =
      operation.start.mock.calls[0].arguments[0];
    assert.ok(requestId);
    assert.deepEqual(request, {
      kind: 'transfer',
      productId: product.id,
      fairId: fair._id,
      direction: 'to_online',
      quantity: 3,
    });
  });

  it('respinge cantități mai mari decât sursa și blochează plata offline', async () => {
    const operation = operationMock();
    const user = userEvent.setup();
    const { rerender } = render(
      <StockTransferDialog
        products={[product]}
        fairs={[fair]}
        initialProductId={product.id}
        operation={operation}
        onClose={() => {}}
      />,
    );
    await user.clear(screen.getByLabelText('Cantitate'));
    await user.type(screen.getByLabelText('Cantitate'), '101');
    await user.click(
      screen.getByRole('button', { name: 'Confirmă transferul' }),
    );
    assert.equal(operation.start.mock.callCount(), 0);
    assert.match(screen.getByRole('alert').textContent ?? '', /sursă/);
    rerender(
      <StockTransferDialog
        products={[product]}
        fairs={[fair]}
        operation={{ ...operation, online: false }}
        onClose={() => {}}
      />,
    );
    assert.equal(
      screen
        .getByRole('button', { name: 'Confirmă transferul' })
        .hasAttribute('disabled'),
      true,
    );
  });

  it('afișează în confirmare stocurile autoritative', () => {
    const notice = inventoryNotice(receipt);
    assert.ok(notice.includes('Total: 134'));
    assert.ok(notice.includes('Online disponibil: 90'));
    assert.ok(notice.includes('Acest târg: 44'));
  });
});

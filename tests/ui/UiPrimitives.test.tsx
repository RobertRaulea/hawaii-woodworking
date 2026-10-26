import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import { Button } from '../../src/components/ui/button.tsx';
import { Input } from '../../src/components/ui/input.tsx';
import { Badge } from '../../src/components/ui/badge.tsx';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../src/components/ui/dialog.tsx';

it('Button renders as a real button and forwards disabled', () => {
  render(<Button disabled>Salvează</Button>);
  const button = screen.getByRole('button', { name: 'Salvează' });
  assert.equal(button.hasAttribute('disabled'), true);
  assert.equal(button.tagName, 'BUTTON');
});

it('Button xl/2xl sizes keep POS touch targets', () => {
  render(
    <>
      <Button size="xl">Cash</Button>
      <Button size="2xl">Card</Button>
    </>,
  );
  assert.ok(
    screen.getByRole('button', { name: 'Cash' }).className.includes('min-h-12'),
  );
  assert.ok(
    screen.getByRole('button', { name: 'Card' }).className.includes('min-h-14'),
  );
});

it('Input renders a labelled textbox', () => {
  render(<Input aria-label="Nume" placeholder="Introdu numele" />);
  const input = screen.getByRole('textbox', { name: 'Nume' });
  assert.equal(input.tagName, 'INPUT');
});

it('Badge renders variants', () => {
  render(<Badge variant="warning">Atenție</Badge>);
  assert.ok(screen.getByText('Atenție').className.includes('bg-amber-100'));
});

it('Dialog opens in a portal and closes via the Romanian close button', async () => {
  const onOpenChange = mock.fn(() => {});
  render(
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Detalii produs</DialogTitle>
        <p>Conținut</p>
      </DialogContent>
    </Dialog>,
  );
  const dialog = screen.getByRole('dialog');
  assert.ok(dialog.textContent?.includes('Detalii produs'));
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Închide' }));
  assert.equal(onOpenChange.mock.callCount(), 1);
  assert.deepEqual(onOpenChange.mock.calls[0].arguments, [false]);
});

it('Dialog close button can be hidden for locked flows', () => {
  render(
    <Dialog open onOpenChange={() => {}}>
      <DialogContent hideClose>
        <DialogTitle>Plată în curs</DialogTitle>
      </DialogContent>
    </Dialog>,
  );
  assert.equal(screen.queryByRole('button', { name: 'Închide' }), null);
});

it('Dialog Escape key requests close through onOpenChange', () => {
  const onOpenChange = mock.fn(() => {});
  render(
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Test</DialogTitle>
      </DialogContent>
    </Dialog>,
  );
  fireEvent.keyDown(document, { key: 'Escape' });
  assert.equal(onOpenChange.mock.callCount(), 1);
  assert.deepEqual(onOpenChange.mock.calls[0].arguments, [false]);
});

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import { SearchableSelect } from '../../src/components/SearchableSelect/SearchableSelect';

const OPTIONS = ['Alba', 'Arad', 'București', 'Cluj', 'Sibiu'] as const;

const Harness = ({
  onChange,
  onBlur,
}: {
  onChange?: (value: string) => void;
  onBlur?: () => void;
}) => {
  const [value, setValue] = useState('');
  return (
    <SearchableSelect
      label="Județ"
      id="county"
      options={OPTIONS}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      onBlur={onBlur}
      required
    />
  );
};

it('focus opens the listbox and shows all options', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const input = screen.getByRole('combobox', { name: 'Județ' });
  assert.equal(screen.queryByRole('listbox'), null);
  await user.click(input);
  assert.ok(screen.getByRole('listbox'));
  for (const opt of OPTIONS) {
    assert.ok(screen.getByRole('option', { name: opt }));
  }
});

it('typing filters options and Enter selects the highlighted one', async () => {
  const user = userEvent.setup();
  const onChange = mock.fn<(value: string) => void>();
  render(<Harness onChange={onChange} />);
  const input = screen.getByRole('combobox', { name: 'Județ' });
  await user.click(input);
  await user.type(input, 'clu');
  assert.ok(screen.getByRole('option', { name: 'Cluj' }));
  assert.equal(screen.queryByRole('option', { name: 'Alba' }), null);
  await user.keyboard('{Enter}');
  assert.equal(onChange.mock.callCount(), 1);
  assert.equal(onChange.mock.calls[0].arguments[0], 'Cluj');
});

it('selecting an option calls onChange, closes and displays the value', async () => {
  const user = userEvent.setup();
  const onChange = mock.fn<(value: string) => void>();
  render(<Harness onChange={onChange} />);
  const input = screen.getByRole('combobox', { name: 'Județ' });
  await user.click(input);
  await user.click(screen.getByRole('option', { name: 'Sibiu' }));
  assert.equal(onChange.mock.calls[0].arguments[0], 'Sibiu');
  assert.equal(screen.queryByRole('listbox'), null);
  assert.equal((input as HTMLInputElement).value, 'Sibiu');
});

it('shows the empty state for an unmatched search', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const input = screen.getByRole('combobox', { name: 'Județ' });
  await user.click(input);
  await user.type(input, 'zzzz');
  assert.ok(screen.getByText('Niciun rezultat'));
});

it('Escape closes without calling onBlur', async () => {
  const user = userEvent.setup();
  const onBlur = mock.fn<() => void>();
  render(<Harness onBlur={onBlur} />);
  const input = screen.getByRole('combobox', { name: 'Județ' });
  await user.click(input);
  assert.ok(screen.getByRole('listbox'));
  await user.keyboard('{Escape}');
  assert.equal(screen.queryByRole('listbox'), null);
  assert.equal(onBlur.mock.callCount(), 0);
});

it('clicking outside closes and calls onBlur', async () => {
  const user = userEvent.setup();
  const onBlur = mock.fn<() => void>();
  render(
    <div>
      <Harness onBlur={onBlur} />
      <button type="button">altundeva</button>
    </div>,
  );
  const input = screen.getByRole('combobox', { name: 'Județ' });
  await user.click(input);
  assert.ok(screen.getByRole('listbox'));
  fireEvent.mouseDown(screen.getByRole('button', { name: 'altundeva' }));
  assert.equal(screen.queryByRole('listbox'), null);
  assert.equal(onBlur.mock.callCount(), 1);
});

it('renders the error message and required marker', () => {
  render(
    <SearchableSelect
      label="Județ"
      id="county"
      options={OPTIONS}
      value=""
      onChange={() => {}}
      error="Județul este obligatoriu"
      required
    />,
  );
  assert.ok(screen.getByText('Județul este obligatoriu'));
  assert.ok(screen.getByText('*'));
});

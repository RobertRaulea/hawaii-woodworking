import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import { SearchableSelect } from '../../src/components/SearchableSelect/SearchableSelect';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../src/components/ui/dialog';

const OPTIONS = ['Alba', 'Arad', 'București', 'Cluj', 'Sibiu'] as const;

const Harness = ({
  onChange,
  onBlur,
  disabled,
  initial = '',
  optionImages,
}: {
  onChange?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  initial?: string;
  optionImages?: ReadonlyMap<string, string | null | undefined>;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <SearchableSelect
      label="Județ"
      id="county"
      options={OPTIONS}
      optionImages={optionImages}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      onBlur={onBlur}
      disabled={disabled}
      required
    />
  );
};

const getTrigger = () => screen.getByRole('combobox', { name: /Județ/ });

it('click opens the listbox and shows all options', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  assert.equal(screen.queryByRole('listbox'), null);
  await user.click(getTrigger());
  assert.ok(screen.getByRole('listbox'));
  for (const opt of OPTIONS) {
    assert.ok(screen.getByRole('option', { name: opt }));
  }
});

it('shows the placeholder when empty and the value when selected', () => {
  const { unmount } = render(<Harness />);
  assert.equal(getTrigger().textContent, 'Selectează...');
  unmount();
  render(<Harness initial="Cluj" />);
  assert.equal(getTrigger().textContent, 'Cluj');
});

it('typing filters options and Enter selects the highlighted one', async () => {
  const user = userEvent.setup();
  const onChange = mock.fn<(value: string) => void>();
  render(<Harness onChange={onChange} />);
  await user.click(getTrigger());
  // The search input receives focus when the popover opens.
  await user.keyboard('clu');
  assert.ok(screen.getByRole('option', { name: 'Cluj' }));
  assert.equal(screen.queryByRole('option', { name: 'Alba' }), null);
  await user.keyboard('{Enter}');
  assert.equal(onChange.mock.callCount(), 1);
  assert.equal(onChange.mock.calls[0].arguments[0], 'Cluj');
});

it('selecting an option calls onChange, closes, displays the value and calls onBlur', async () => {
  const user = userEvent.setup();
  const onChange = mock.fn<(value: string) => void>();
  const onBlur = mock.fn<() => void>();
  render(<Harness onChange={onChange} onBlur={onBlur} />);
  await user.click(getTrigger());
  await user.click(screen.getByRole('option', { name: 'Sibiu' }));
  assert.equal(onChange.mock.calls[0].arguments[0], 'Sibiu');
  assert.equal(screen.queryByRole('listbox'), null);
  assert.equal(getTrigger().textContent, 'Sibiu');
  assert.equal(onBlur.mock.callCount(), 1);
});

it('shows the empty state for an unmatched search', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(getTrigger());
  await user.keyboard('zzzz');
  assert.ok(screen.getByText('Niciun rezultat'));
});

it('marks the chosen option with a check icon', async () => {
  const user = userEvent.setup();
  render(<Harness initial="Arad" />);
  await user.click(getTrigger());
  const chosen = screen.getByRole('option', { name: 'Arad' });
  assert.ok(chosen.querySelector('svg'));
  assert.equal(
    screen.getByRole('option', { name: 'Alba' }).querySelector('svg') === null,
    true,
  );
});

it('renders option thumbnails when optionImages is provided', async () => {
  const user = userEvent.setup();
  const images = new Map<string, string | null>([['Alba', '/alba.jpg']]);
  render(<Harness optionImages={images} />);
  await user.click(getTrigger());
  const alba = screen.getByRole('option', { name: 'Alba' });
  assert.equal(alba.querySelector('img')?.getAttribute('src'), '/alba.jpg');
  // Options without an image get the placeholder (svg), not an <img>.
  assert.equal(
    screen.getByRole('option', { name: 'Arad' }).querySelector('img') === null,
    true,
  );
});

it('ArrowDown on the trigger opens, Escape closes and returns focus', async () => {
  const user = userEvent.setup();
  const onBlur = mock.fn<() => void>();
  render(<Harness onBlur={onBlur} />);
  getTrigger().focus();
  await user.keyboard('{ArrowDown}');
  assert.ok(screen.getByRole('listbox'));
  await user.keyboard('{Escape}');
  assert.equal(screen.queryByRole('listbox'), null);
  assert.equal(document.activeElement, getTrigger());
  assert.equal(onBlur.mock.callCount(), 1);
});

it('Enter on the trigger opens the listbox', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  getTrigger().focus();
  await user.keyboard('{Enter}');
  assert.ok(screen.getByRole('listbox'));
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
  await user.click(getTrigger());
  assert.ok(screen.getByRole('listbox'));
  // The modal popover disables pointer events outside, so simulate the raw
  // pointer sequence; Radix defers dismissal of a primary-button press to click.
  const outside = screen.getByText('altundeva', { ignore: '[aria-hidden]' });
  fireEvent.pointerDown(outside, { button: 0, pointerType: 'mouse' });
  fireEvent.click(outside);
  await waitFor(() => assert.equal(screen.queryByRole('listbox') === null, true));
  assert.equal(onBlur.mock.callCount(), 1);
});

it('renders the error message, required marker and aria-invalid', () => {
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
  const trigger = getTrigger();
  assert.equal(trigger.getAttribute('aria-invalid'), 'true');
  assert.ok(trigger.className.includes('border-red-400'));
});

it('has no aria-invalid without an error', () => {
  render(<Harness />);
  assert.equal(getTrigger().getAttribute('aria-invalid'), null);
});

it('disabled does not open', async () => {
  const user = userEvent.setup();
  render(<Harness disabled />);
  const trigger = getTrigger();
  assert.equal((trigger as HTMLButtonElement).disabled, true);
  await user.click(trigger);
  assert.equal(screen.queryByRole('listbox'), null);
});

it('label click opens the select and the label is associated with the trigger', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const label = screen.getByText('Județ', { selector: 'label' });
  assert.equal(label.getAttribute('for'), 'county');
  assert.equal(getTrigger().id, 'county');
  await user.click(label);
  assert.ok(screen.getByRole('listbox'));
});

it('works inside a Dialog: selection works and wheel scrolling is not blocked', async () => {
  const user = userEvent.setup();
  const onChange = mock.fn<(value: string) => void>();
  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Dialog</DialogTitle>
        <Harness onChange={onChange} />
      </DialogContent>
    </Dialog>,
  );
  await user.click(getTrigger());
  const listbox = screen.getByRole('listbox');
  // react-remove-scroll (modal Dialog) calls preventDefault on wheel events it
  // considers outside its allowed shards. The modal Popover registers its own
  // scroll lock with the list as a shard, so a scrollable list must not be blocked.
  // (jsdom has no layout, so this guards regressions but is not a proof by itself.)
  // jsdom has no layout/CSS: make the list look scrollable like in a browser.
  listbox.style.overflowY = 'auto';
  Object.defineProperty(listbox, 'scrollHeight', { value: 500 });
  Object.defineProperty(listbox, 'clientHeight', { value: 240 });
  const wheel = new window.WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    deltaY: 40,
  });
  listbox.dispatchEvent(wheel);
  assert.equal(wheel.defaultPrevented, false);
  await user.click(screen.getByRole('option', { name: 'Arad' }));
  assert.equal(onChange.mock.calls[0].arguments[0], 'Arad');
});

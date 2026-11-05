import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { HeaderDropdown } from '../../src/components/SettingsMenu/HeaderDropdown';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: (q: string) => ({ matches: true, media: q, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {},
      removeEventListener() {}, dispatchEvent: () => false }),
  });
  document.querySelectorAll('.cl-userButtonPopoverCard').forEach((el) => el.remove());
});

const openMenu = async () => {
  const view = render(
    <HeaderDropdown label="Setări" icon={<span>I</span>}>
      <button type="button" data-testid="inside-item">Conținut</button>
    </HeaderDropdown>,
  );
  const wrapper = view.container.firstElementChild as HTMLElement;
  fireEvent.mouseEnter(wrapper);
  await screen.findByTestId('inside-item');
  return { view, wrapper };
};

const clerkPopover = () => {
  const popover = document.createElement('div');
  popover.className = 'cl-userButtonPopoverCard';
  const button = document.createElement('button');
  popover.appendChild(button);
  document.body.appendChild(popover);
  return { popover, button };
};

test('hover opens the menu and hover-out closes it after the delay', async () => {
  const { wrapper } = await openMenu();
  fireEvent.mouseLeave(wrapper);
  await sleep(600);
  assert.equal(screen.queryByTestId('inside-item'), null);
});

test('an open Clerk popover pins the menu until the popover closes', async () => {
  const { wrapper } = await openMenu();
  const { popover } = clerkPopover();
  await sleep(0);
  fireEvent.mouseLeave(wrapper);
  await sleep(450);
  assert.ok(screen.queryByTestId('inside-item'), 'menu stays open while Clerk popover is mounted');
  popover.remove();
  await sleep(600);
  assert.equal(screen.queryByTestId('inside-item'), null);
});

test('pointer events inside the Clerk overlay do not dismiss the menu', async () => {
  await openMenu();
  const { popover, button } = clerkPopover();
  await sleep(0);
  fireEvent.pointerDown(button);
  await sleep(50);
  assert.ok(screen.queryByTestId('inside-item'));
  popover.remove();
});

test('a pointerdown on the page still dismisses the menu', async () => {
  await openMenu();
  fireEvent.pointerDown(document.body);
  await sleep(150);
  assert.equal(screen.queryByTestId('inside-item'), null);
});

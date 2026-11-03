import { act, renderHook } from '@testing-library/react';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import type { ReactNode } from 'react';

const success = mock.fn();
const error = mock.fn();
mock.module(
  new URL('../../src/components/ui/sonner.tsx', import.meta.url).href,
  { namedExports: { toast: { success, error } } },
);

const { CartProvider, useCart } = await import('../../src/context/CartContext.tsx');

const item = {
  id: 'product-1',
  name: 'Wooden bowl',
  price: 50,
  image: '/bowl.jpg',
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

beforeEach(() => {
  localStorage.clear();
  success.mock.resetCalls();
  error.mock.resetCalls();
});

it('preserves a new product quantity of three and accumulates a repeat add of two', () => {
  const { result } = renderHook(useCart, { wrapper });
  act(() => {
    assert.equal(result.current.addItem(item, 5, true, 3), true);
  });
  assert.equal(result.current.state.items[0].quantity, 3);
  assert.equal(result.current.totalItems, 3);
  assert.equal(JSON.parse(localStorage.getItem('cart') ?? '{}').items[0].quantity, 3);

  act(() => {
    assert.equal(result.current.addItem(item, 5, true, 2), true);
  });
  assert.equal(result.current.state.items.length, 1);
  assert.equal(result.current.state.items[0].quantity, 5);
  assert.equal(result.current.totalItems, 5);
});

it('refuses an initial stock overage without mutating state or persisted cart', () => {
  const { result } = renderHook(useCart, { wrapper });
  const initialState = result.current.state;
  const persisted = localStorage.getItem('cart');
  act(() => {
    assert.equal(result.current.addItem(item, 2, true, 3), false);
  });
  assert.equal(result.current.state, initialState);
  assert.equal(result.current.totalItems, 0);
  assert.equal(localStorage.getItem('cart'), persisted);
  assert.equal(success.mock.callCount(), 0);
  assert.equal(error.mock.callCount(), 1);
});

it('refuses cumulative stock overage without modifying an existing line', () => {
  const { result } = renderHook(useCart, { wrapper });
  act(() => {
    result.current.addItem(item, 5, true, 3);
  });
  const previousState = result.current.state;
  const persisted = localStorage.getItem('cart');
  act(() => {
    assert.equal(result.current.addItem(item, 5, true, 3), false);
  });
  assert.equal(result.current.state, previousState);
  assert.equal(result.current.state.items[0].quantity, 3);
  assert.equal(localStorage.getItem('cart'), persisted);
});

it('defaults omitted quantity to one with stock tracking enabled by default', () => {
  const { result } = renderHook(useCart, { wrapper });
  act(() => {
    assert.equal(result.current.addItem(item, 5), true);
  });
  assert.equal(result.current.state.items[0].quantity, 1);
  assert.equal(result.current.totalItems, 1);
});

it('preserves requested quantities when stock tracking is disabled', () => {
  const { result } = renderHook(useCart, { wrapper });
  act(() => {
    assert.equal(result.current.addItem(item, 0, false, 3), true);
  });
  assert.equal(result.current.state.items[0].quantity, 3);
});

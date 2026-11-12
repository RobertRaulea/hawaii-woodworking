import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import type { ReactNode } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';

const en = JSON.parse(
  readFileSync(new URL('../../src/i18n/locales/en.json', import.meta.url), 'utf8'),
);
await i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

let addItemResult = true;
const addItem = mock.fn(() => addItemResult);
const flyToCart = mock.fn();
const cartState = { items: [] as { id: string; quantity: number }[] };

mock.module(new URL('../../src/context/CartContext.tsx', import.meta.url).href, {
  namedExports: {
    useCart: () => ({ addItem, state: cartState }),
  },
});
mock.module(new URL('../../src/utils/flyToCart.utils.ts', import.meta.url).href, {
  namedExports: { flyToCart },
});
mock.module(new URL('../../src/components/ImageCarousel/ImageCarousel.tsx', import.meta.url).href, {
  namedExports: { ImageCarousel: () => null },
});

const { ProductCard } = await import('../../src/components/ProductCard/ProductCard.tsx');

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

const props = {
  id: 'product-1',
  name: 'Wooden bowl',
  price: 50,
  imageUrls: ['/bowl_main.png', '/bowl_alt.png'],
  stock: 5,
};

beforeEach(() => {
  addItemResult = true;
  addItem.mock.resetCalls();
  flyToCart.mock.resetCalls();
});

it('flies the cover image to the cart from the clicked button on a successful add', () => {
  render(<ProductCard {...props} />, { wrapper });
  const button = screen.getByRole('button', { name: 'Add to Cart' });

  fireEvent.click(button);

  assert.equal(addItem.mock.callCount(), 1);
  assert.equal(flyToCart.mock.callCount(), 1);
  const call = flyToCart.mock.calls[0];
  assert.equal(call.arguments[0], button);
  assert.equal(call.arguments[1], '/bowl_main.png');
});

it('does not fly to the cart when addItem refuses', () => {
  addItemResult = false;
  render(<ProductCard {...props} />, { wrapper });

  fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

  assert.equal(addItem.mock.callCount(), 1);
  assert.equal(flyToCart.mock.callCount(), 0);
});

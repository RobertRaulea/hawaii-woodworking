import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { CartItem } from '../../src/types/cart.types';

let cartItems: CartItem[] = [];
let product: unknown = null;

mock.module('../../src/context/CartContext.tsx', { namedExports: {
  useCart: () => ({
    state: { items: cartItems },
    addItem: () => true,
    removeItem: () => {},
    updateQuantity: () => {},
    clearCart: () => {},
    totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
  }),
} });
mock.module('react-i18next', { namedExports: {
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ro', resolvedLanguage: 'ro' },
  }),
} });
const analyticsStatus = { ready: false, epoch: 0 };
mock.module('../../src/utils/analytics.utils.ts', { namedExports: {
  getAnalyticsStatus: () => analyticsStatus,
  subscribeAnalytics: () => () => {},
  trackAnalytics: () => {},
} });
mock.module('../../src/hooks/useAdminQuery.ts', { namedExports: {
  useAdminQuery: () => ({ data: product, error: null }),
} });
mock.module('../../src/context/LanguageContext.tsx', { namedExports: {
  useLanguage: () => ({ language: 'ro' }),
} });
mock.module('../../src/components/ProductGallery/ProductGallery.tsx', { namedExports: {
  ProductGallery: () => <div data-testid="quick-view-gallery" />,
} });
mock.module('../../src/utils/flyToCart.utils.ts', { namedExports: {
  flyToCart: () => {},
} });

const { Cart } = await import('../../src/pages/Cart/Cart.tsx');

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

const productFixture = {
  _id: 'product-1',
  name: 'Wooden bowl',
  price: 50,
  imageUrls: ['/bowl.jpg'],
  availableStock: 5,
  trackStock: true,
  description: 'Handmade bowl',
  category: 'Bowls',
};

beforeEach(() => {
  cartItems = [
    {
      id: 'product-1',
      name: 'Wooden bowl',
      price: 50,
      image: '/bowl.jpg',
      quantity: 2,
      stock: 5,
      trackStock: true,
    },
  ];
  product = productFixture;
});

it('opens the product quick view when the cart item title is clicked', async () => {
  render(<Cart />, { wrapper });

  assert.equal(screen.queryByRole('dialog'), null);

  fireEvent.click(screen.getByRole('button', { name: 'Wooden bowl' }));

  const dialog = await screen.findByRole('dialog');
  assert.ok(
    within(dialog).getAllByRole('heading', { name: 'Wooden bowl' }).length >= 1,
  );
  assert.ok(within(dialog).getByText('Handmade bowl'));
  assert.ok(within(dialog).getByText(/50\.00/));
  assert.ok(within(dialog).getByRole('button', { name: 'product.addToCart' }));
  assert.ok(within(dialog).getByRole('link', { name: /product\.viewDetails/ }));
});

it('opens the product quick view from the cart item image', async () => {
  render(<Cart />, { wrapper });

  fireEvent.click(
    screen.getByRole('button', { name: 'product.viewDetails: Wooden bowl' }),
  );

  assert.ok(await screen.findByRole('dialog'));
});

it('closes the quick view and returns to the cart', async () => {
  render(<Cart />, { wrapper });

  fireEvent.click(screen.getByRole('button', { name: 'Wooden bowl' }));
  assert.ok(await screen.findByRole('dialog'));

  fireEvent.click(screen.getByRole('button', { name: 'common.close' }));

  await waitFor(() => {
    assert.equal(screen.queryByRole('dialog'), null);
  });
});

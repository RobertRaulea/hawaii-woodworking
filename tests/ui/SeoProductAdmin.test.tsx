import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getFunctionName } from 'convex/server';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import * as helmetEsm from 'react-helmet-async/lib/index.esm.js';
const { HelmetProvider } = helmetEsm;
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readFileSync } from 'node:fs';

const ro = JSON.parse(
  readFileSync(new URL('../../src/i18n/locales/ro.json', import.meta.url), 'utf8'),
);
await i18n.use(initReactI18next).init({
  resources: { ro: { translation: ro } },
  lng: 'ro',
  fallbackLng: 'ro',
  interpolation: { escapeValue: false },
});

mock.module('react-helmet-async', { namedExports: helmetEsm });

import { LanguageProvider } from '../../src/context/LanguageContext';
import { CartProvider } from '../../src/context/CartContext';

if (!('HTMLFormElement' in globalThis)) {
  Object.defineProperty(globalThis, 'HTMLFormElement', {
    configurable: true,
    writable: true,
    value: window.HTMLFormElement,
  });
}

const query = mock.fn<(reference: unknown, args?: unknown) => unknown>(() => undefined);
const mutation = mock.fn<(reference: unknown, args: unknown) => Promise<unknown>>(async () => 'id');

mock.module('convex/react', {
  namedExports: {
    useQuery: query,
    useMutation: () => mutation,
    usePaginatedQuery: () => ({ results: [], status: 'Exhausted', loadMore: () => {} }),
    useConvex: () => ({ mutation, query: async () => null }),
  },
});

const { Home } = await import('../../src/pages/Home/Home.tsx');
const { ProductForm } = await import('../../src/pages/Admin/Products/ProductForm.tsx');

const catalogRows = [
  {
    _id: 'p1',
    _creationTime: 1,
    name: 'Tocător',
    price: 120,
    sku: 'TCS-01',
    trackStock: true,
    stock: 5,
    availableStock: 5,
    status: 'active',
    seoTitle: 'Titlu SEO salvat',
    seoDescription: 'Descriere SEO salvată',
    imageUrls: [],
  },
];

const detailProduct = {
  _id: 'jx7abc',
  _creationTime: 1,
  name: 'Tocător mare',
  price: 150,
  sku: 'TCM-01',
  trackStock: true,
  stock: 10,
  availableStock: 10,
  lowStockThreshold: 5,
  status: 'active',
  imageUrls: [],
};

query.mock.mockImplementation((reference, args) => {
  if (args === 'skip') return undefined;
  const name = getFunctionName(reference as never);
  if (name === 'products:getById') return detailProduct;
  if (name === 'products:getAll' || name === 'products:listAdmin') return catalogRows;
  if (name === 'categories:getAll') return [{ _id: 'c1', name: 'Bucătărie' }];
  return [];
});

const renderWithProviders = (
  element: React.ReactNode,
  entries: string[] = ['/'],
  routePath = '*',
) =>
  render(
    <HelmetProvider>
      <LanguageProvider>
        <CartProvider>
        <MemoryRouter initialEntries={entries}>
          <Routes>
            <Route path={routePath} element={element} />
          </Routes>
        </MemoryRouter>
        </CartProvider>
      </LanguageProvider>
    </HelmetProvider>,
  );

it('home embeds listing without a second h1 or conflicting SEO', async () => {
  renderWithProviders(<Home />);
  await new Promise((resolve) => setTimeout(resolve, 60));
  const h1s = screen.getAllByRole('heading', { level: 1 });
  assert.equal(h1s.length, 1);
  assert.ok(screen.getByRole('heading', { level: 2, name: 'Produse' }));
  const title = document.head.querySelector('title')?.textContent ?? '';
  assert.ok(title.includes('Hawaii Woodworking'));
  assert.equal(title.split('Hawaii Woodworking').length - 1, 1);
  const ld = document.head.querySelector('script[type="application/ld+json"]')?.textContent ?? '';
  assert.ok(!ld.includes('SearchAction'));
  assert.ok(ld.includes('"Organization"'));
});

it('product form persists SEO overrides and clears them with empty string', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ProductForm />, ['/admin/products/p1'], '/admin/products/:id');
  await new Promise((resolve) => setTimeout(resolve, 60));
  const titleInput = screen.getByLabelText(/Titlu SEO/) as HTMLInputElement;
  assert.equal(titleInput.value, 'Titlu SEO salvat');
  assert.ok(screen.getByTestId('seo-preview'));
  await user.clear(titleInput);
  await user.click(screen.getByRole('button', { name: 'Actualizează produsul' }));
  await new Promise((resolve) => setTimeout(resolve, 60));
  const calls = mutation.mock.calls.map((call) => call.arguments[0] as Record<string, unknown>);
  const update = calls.find((args) => args.id === 'p1');
  assert.ok(update, 'updateProduct called');
  assert.equal(update.seoTitle, '');
  assert.equal(update.seoDescription, 'Descriere SEO salvată');
});

it('product detail schema availability uses catalog stock, not cart-subtracted stock', async () => {
  localStorage.setItem(
    'cart',
    JSON.stringify({ items: [{ id: 'jx7abc', name: 'Tocător mare', price: 150, image: '', quantity: 8 }] }),
  );
  const { ProductDetailPage } = await import(
    '../../src/pages/ProductDetail/ProductDetailPage.tsx'
  );
  renderWithProviders(<ProductDetailPage />, ['/product/jx7abc'], '/product/:productId');
  await new Promise((resolve) => setTimeout(resolve, 80));
  const ld = document.head.querySelector('script[type="application/ld+json"]')?.textContent ?? '';
  assert.ok(ld.includes('"Product"'));
  const parsed = JSON.parse(ld);
  const offer = parsed['@graph'][0].offers;
  assert.equal(offer.availability, 'https://schema.org/InStock');
  assert.equal(offer.price, '150.00');
  assert.ok(document.body.textContent?.includes('2'));
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getFunctionName } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import type { RequestForQueries } from 'convex/react';
import i18n from 'i18next';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, it, mock } from 'node:test';
import { initReactI18next } from 'react-i18next';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';

Object.defineProperty(globalThis, 'HTMLFormElement', {
  configurable: true,
  value: window.HTMLFormElement,
});

const resources = Object.fromEntries(
  ['ro', 'en', 'de'].map((language) => [
    language,
    {
      translation: JSON.parse(
        readFileSync(
          new URL(`../../src/i18n/locales/${language}.json`, import.meta.url),
          'utf8',
        ),
      ),
    },
  ]),
);
await i18n.use(initReactI18next).init({
  resources,
  lng: 'ro',
  fallbackLng: 'ro',
  interpolation: { escapeValue: false },
});

let clerkAuth = { isLoaded: true, isSignedIn: true };
let convexAuth = { isLoading: false, isAuthenticated: true };
let readResult: unknown = undefined;

const catalog = [
  { _id: 'bowl', name: 'Bowl', price: 10, category: 'Decor', availableStock: 5 },
  { _id: 'tray', name: 'Tray', price: 30, category: 'Kitchen', availableStock: 5 },
  { _id: 'vase', name: 'Vase', price: 50, category: 'Decor', availableStock: 5 },
];
const query = mock.fn<
  (reference: FunctionReference<'query'>, args?: unknown) => unknown
>((reference, args) => {
  if (args === 'skip') return undefined;
  switch (getFunctionName(reference)) {
    case 'products:getAll':
      return catalog;
    case 'categories:getAll':
      return [
        { _id: 'decor', name: 'Decor' },
        { _id: 'kitchen', name: 'Kitchen' },
      ];
    case 'orders:getMyOrders':
      return [];
    case 'siteAssets:getByCategory':
      return [];
    default:
      throw new Error(`Unexpected query: ${getFunctionName(reference)}`);
  }
});
const queries = mock.fn<(requests: RequestForQueries) => Record<string, unknown>>(
  (requests) => requests.data ? { data: readResult } : {},
);
mock.module('convex/react', {
  namedExports: {
    useQuery: query,
    useQueries: queries,
    useConvexAuth: () => convexAuth,
  },
});
mock.module('@clerk/clerk-react', {
  namedExports: {
    useAuth: () => clerkAuth,
    UserButton: () => null,
  },
});
mock.module(
  new URL('../../src/components/SEO/SEO.tsx', import.meta.url).href,
  { namedExports: { SEO: () => null } },
);

const { LanguageProvider } = await import('../../src/context/LanguageContext.tsx');
const { CartProvider } = await import('../../src/context/CartContext.tsx');
const { Layout } = await import('../../src/components/Layout/Layout.tsx');
const { Products } = await import('../../src/pages/Products/Products.tsx');
const { ProductDetailPage } = await import('../../src/pages/ProductDetail/ProductDetailPage.tsx');
const { MyOrders } = await import('../../src/pages/MyOrders/MyOrders.tsx');
const { MyOrderDetail } = await import('../../src/pages/MyOrders/MyOrderDetail.tsx');

const HistoryControls = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <nav aria-label="Test history">
      <button onClick={() => navigate(-1)}>History back</button>
      <button onClick={() => navigate(1)}>History forward</button>
      <output aria-label="Current URL">{location.pathname}{location.search}</output>
    </nav>
  );
};

interface StorefrontProps {
  entries: string[];
  initialIndex?: number;
}

const Storefront = ({ entries, initialIndex }: StorefrontProps) => (
  <LanguageProvider>
    <CartProvider>
      <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
        <HistoryControls />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/products" element={<Products />} />
            <Route path="/product/:productId" element={<ProductDetailPage />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/my-orders/:id" element={<MyOrderDetail />} />
            <Route path="/login" element={<h1>Login destination</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </CartProvider>
  </LanguageProvider>
);

const assertShellVisible = () => {
  assert.ok(screen.getByRole('banner'));
  assert.ok(screen.getByRole('contentinfo'));
  assert.equal(
    within(screen.getByRole('banner')).getByRole('img', { name: /Hawaii/ })
      .closest('a')?.getAttribute('href'),
    '/',
  );
};

const assertReloadWorks = () => {
  const reload = mock.fn();
  const originalWindow = window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: new Proxy(originalWindow, {
      get: (target, property) => property === 'location'
        ? { reload }
        : Reflect.get(target, property),
    }),
  });
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Reîncarcă pagina' }));
    assert.equal(reload.mock.callCount(), 1);
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: originalWindow,
    });
  }
};

beforeEach(async () => {
  clerkAuth = { isLoaded: true, isSignedIn: true };
  convexAuth = { isLoading: false, isAuthenticated: true };
  readResult = undefined;
  query.mock.resetCalls();
  queries.mock.resetCalls();
  await i18n.changeLanguage('ro');
});

it('malformed product IDs leave the real storefront shell visible with recovery instead of a 404', async () => {
  readResult = new Error('ArgumentValidationError: invalid products ID');
  render(<Storefront entries={['/product/this-is-not-a-convex-id']} />);
  assertShellVisible();
  const alert = screen.getByRole('alert');
  assert.match(alert.textContent ?? '', /Datele nu pot fi încărcate/);
  assert.equal(screen.queryByText('Produsul nu a fost găsit'), null);
  const request = queries.mock.calls.find((call) => call.arguments[0].data)?.arguments[0].data;
  assert.equal(getFunctionName(request!.query), 'products:getById');
  assert.deepEqual(request?.args, { id: 'this-is-not-a-convex-id' });
  assertReloadWorks();
  const back = within(alert).getByRole('link', { name: 'Vezi toate produsele' });
  assert.equal(back.getAttribute('href'), '/products');
  await userEvent.click(back);
  assert.ok(screen.getByRole('heading', { level: 1, name: 'Produse' }));
  assertShellVisible();
});

it('a rejected private order read is a recoverable alert, not an empty or missing order', async () => {
  readResult = new Error('Unauthorized or connection unavailable');
  render(<Storefront entries={['/my-orders/bad-order-id']} />);
  assertShellVisible();
  const alert = screen.getByRole('alert');
  assert.match(alert.textContent ?? '', /Datele nu pot fi încărcate/);
  assert.equal(screen.queryByText('Comanda nu a fost găsită.'), null);
  assertReloadWorks();
  const request = queries.mock.calls.find((call) => call.arguments[0].data)?.arguments[0].data;
  assert.equal(getFunctionName(request!.query), 'orders:getMyOrderById');
  assert.deepEqual(request?.args, { orderId: 'bad-order-id' });
  await userEvent.click(within(alert).getByRole('link', { name: 'Înapoi la comenzi' }));
  assert.ok(screen.getByRole('heading', { level: 1, name: 'Comenzile mele' }));
});

for (const page of [
  { path: '/product/missing', missing: 'Produsul nu a fost găsit', back: '/products' },
  { path: '/my-orders/missing', missing: 'Comanda nu a fost găsită.', back: '/my-orders' },
]) {
  it(`${page.path} distinguishes a successful null result from loading and read failure`, () => {
    const view = render(<Storefront entries={[page.path]} />);
    assertShellVisible();
    assert.equal(screen.queryByRole('alert'), null);
    assert.equal(screen.queryByText(page.missing), null);
    readResult = null;
    view.rerender(<Storefront entries={[page.path]} />);
    assert.ok(screen.getByText(page.missing));
    assert.equal(screen.queryByRole('alert'), null);
    assert.equal(screen.queryByRole('button', { name: 'Reîncarcă pagina' }), null);
    assert.ok(
      screen.getAllByRole('link').some((link) => link.getAttribute('href') === page.back),
    );
    assertShellVisible();
  });
}

for (const path of ['/my-orders', '/my-orders/private-order']) {
  it(`${path} redirects anonymous customers declaratively without executing private queries`, async () => {
    clerkAuth = { isLoaded: true, isSignedIn: false };
    convexAuth = { isLoading: false, isAuthenticated: false };
    const errors = mock.method(console, 'error', () => {});
    const warnings = mock.method(console, 'warn', () => {});
    try {
      render(<Storefront entries={[path]} />);
      assert.ok(await screen.findByRole('heading', { name: 'Login destination' }));
      assert.equal(
        query.mock.calls.filter((call) =>
          getFunctionName(call.arguments[0]).startsWith('orders:') &&
          call.arguments[1] !== 'skip',
        ).length,
        0,
      );
      assert.ok(queries.mock.calls.every((call) => Object.keys(call.arguments[0]).length === 0));
      const messages = [...errors.mock.calls, ...warnings.mock.calls]
        .flatMap((call) => call.arguments)
        .join(' ');
      assert.doesNotMatch(messages, /Cannot update a component|while rendering|You should call navigate/);
      assertShellVisible();
    } finally {
      errors.mock.restore();
      warnings.mock.restore();
    }
  });

  it(`${path} waits for both Clerk loading and Convex auth readiness before subscribing`, () => {
    clerkAuth = { isLoaded: false, isSignedIn: false };
    convexAuth = { isLoading: true, isAuthenticated: false };
    const view = render(<Storefront entries={[path]} />);
    assert.equal(screen.queryByRole('heading', { name: 'Login destination' }), null);
    clerkAuth = { isLoaded: true, isSignedIn: true };
    view.rerender(<Storefront entries={[path]} />);
    assert.equal(
      query.mock.calls.filter((call) =>
        getFunctionName(call.arguments[0]).startsWith('orders:') &&
        call.arguments[1] !== 'skip',
      ).length,
      0,
    );
    assert.ok(queries.mock.calls.every((call) => Object.keys(call.arguments[0]).length === 0));
    convexAuth = { isLoading: false, isAuthenticated: true };
    view.rerender(<Storefront entries={[path]} />);
    if (path === '/my-orders') {
      assert.ok(query.mock.calls.some((call) =>
        getFunctionName(call.arguments[0]) === 'orders:getMyOrders' &&
        call.arguments[1] !== 'skip',
      ));
    } else {
      assert.ok(queries.mock.calls.some((call) =>
        call.arguments[0].data &&
        getFunctionName(call.arguments[0].data.query) === 'orders:getMyOrderById',
      ));
    }
  });
}

for (const language of [
  { code: 'en', reload: 'Reload page', message: /could not be loaded/ },
  { code: 'de', reload: 'Seite neu laden', message: /konnten nicht geladen werden/ },
]) {
  for (const path of ['/product/bad-id', '/my-orders/bad-id']) {
    it(`localizes ${path} recovery in ${language.code}`, () => {
      localStorage.setItem('i18nextLng', language.code);
      readResult = new Error('Read failed');
      render(<Storefront entries={[path]} />);
      assert.match(screen.getByRole('alert').textContent ?? '', language.message);
      assert.ok(screen.getByRole('button', { name: language.reload }));
    });
  }
}

const productNames = () =>
  screen.getAllByRole('heading', { level: 3 })
    .filter((heading) => heading.closest('a')?.getAttribute('href')?.startsWith('/product/'))
    .map((heading) => heading.textContent);

it('URL history Back clears category, price and sort state, and Forward restores valid filters', async () => {
  render(<Storefront
    entries={['/products', '/products?categories=Decor&minPrice=20&maxPrice=50&sort=price-desc']}
    initialIndex={1}
  />);
  assert.deepEqual(productNames(), ['Vase']);
  assert.equal((screen.getByLabelText('Min') as HTMLInputElement).value, '20');
  assert.equal((screen.getByLabelText('Max') as HTMLInputElement).value, '50');
  assert.equal((screen.getByLabelText(/Sortează/) as HTMLSelectElement).value, 'price-desc');
  assert.equal(screen.getByRole('checkbox', { name: /Decor/ }).getAttribute('aria-checked'), 'true');
  await userEvent.click(screen.getByRole('button', { name: 'History back' }));
  await waitFor(() => assert.deepEqual(productNames(), ['Bowl', 'Tray', 'Vase']));
  assert.equal((screen.getByLabelText('Min') as HTMLInputElement).value, '10');
  assert.equal((screen.getByLabelText('Max') as HTMLInputElement).value, '50');
  assert.equal((screen.getByLabelText(/Sortează/) as HTMLSelectElement).value, 'price-asc');
  assert.equal(screen.getByRole('checkbox', { name: /Decor/ }).getAttribute('aria-checked'), 'false');
  await userEvent.click(screen.getByRole('button', { name: 'History forward' }));
  await waitFor(() => assert.deepEqual(productNames(), ['Vase']));
  assert.equal((screen.getByLabelText(/Sortează/) as HTMLSelectElement).value, 'price-desc');
});

for (const params of [
  { query: 'minPrice=NaN&maxPrice=Infinity&sort=invalid', min: 10, max: 50 },
  { query: 'minPrice=20oops&maxPrice=35.5', min: 10, max: 50 },
  { query: 'minPrice=2e1&maxPrice=', min: 10, max: 50 },
  { query: 'minPrice=-100&maxPrice=999999', min: 10, max: 50 },
  { query: 'minPrice=45&maxPrice=20', min: 20, max: 45 },
  { query: 'minPrice=20&maxPrice=40', min: 20, max: 40 },
  { query: `minPrice=${'9'.repeat(400)}&maxPrice=50`, min: 10, max: 50 },
]) {
  it(`normalizes URL price and sort parameters: ${params.query.slice(0, 70)}`, () => {
    render(<Storefront entries={[`/products?${params.query}`]} />);
    assert.equal((screen.getByLabelText('Min') as HTMLInputElement).value, String(params.min));
    assert.equal((screen.getByLabelText('Max') as HTMLInputElement).value, String(params.max));
    assert.equal((screen.getByLabelText(/Sortează/) as HTMLSelectElement).value, 'price-asc');
  });
}

it('invalid sort resets a previously selected sort and user filters preserve existing URL conventions', async () => {
  render(<Storefront
    entries={['/products?sort=bad', '/products?sort=price-desc']}
    initialIndex={1}
  />);
  assert.deepEqual(productNames(), ['Vase', 'Tray', 'Bowl']);
  await userEvent.click(screen.getByRole('button', { name: 'History back' }));
  assert.deepEqual(productNames(), ['Bowl', 'Tray', 'Vase']);
  await userEvent.click(screen.getByRole('checkbox', { name: /Kitchen/ }));
  assert.equal(screen.getByLabelText('Current URL').textContent, '/products?categories=Kitchen');
  await userEvent.selectOptions(screen.getByLabelText(/Sortează/), 'name-asc');
  assert.equal(
    screen.getByLabelText('Current URL').textContent,
    '/products?categories=Kitchen&sort=name-asc',
  );
});

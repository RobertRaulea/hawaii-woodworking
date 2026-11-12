import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeEach, it, mock } from 'node:test';
import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getFunctionName } from 'convex/server';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { CardTitle } from '../../src/components/ui/card';
import type { ShippingFormData } from '../../src/types/shipping.types';
import { pickOption } from './optionSelect.helpers';

const resources = Object.fromEntries(
  ['ro', 'en', 'de'].map((language) => [
    language,
    {
      translation: JSON.parse(readFileSync(
        new URL(`../../src/i18n/locales/${language}.json`, import.meta.url),
        'utf8',
      )),
    },
  ]),
);
await i18n.use(initReactI18next).init({
  resources,
  lng: 'ro',
  fallbackLng: 'ro',
  interpolation: { escapeValue: false },
});

const catalogProduct = {
  _id: 'product-1',
  _creationTime: 1,
  name: 'Platou din lemn',
  price: 45,
  sku: 'PLT-01',
  category: 'Decorațiuni',
  stock: 12,
  trackStock: true,
  status: 'active',
  imageUrls: [null],
};

interface AppearanceProps {
  appearance: { elements: Record<string, string> };
}

let shippingDefaults: ShippingFormData | null = null;

mock.module('@clerk/clerk-react', {
  namedExports: {
    useAuth: () => ({ isSignedIn: false }),
    useUser: () => ({ isLoaded: true, isSignedIn: false, user: null }),
    useSignUp: () => ({ isLoaded: true, signUp: null, setActive: async () => {} }),
    SignIn: ({ appearance }: AppearanceProps) => (
      <div data-testid="signin-root" className={appearance.elements.rootBox}>
        <div data-testid="signin-card" className={appearance.elements.card}>
          <h2 className={appearance.elements.headerTitle}>Conectare Clerk</h2>
        </div>
      </div>
    ),
  },
});
mock.module('convex/react', {
  namedExports: {
    useQuery: (reference: Parameters<typeof getFunctionName>[0]) => {
      const name = getFunctionName(reference);
      if (name === 'products:listAdmin') return [catalogProduct];
      if (name === 'categories:getAll') return [{ _id: 'category-1', name: 'Decorațiuni' }];
      return undefined;
    },
    useMutation: () => async () => {
      throw new Error('No mutation is expected in accessibility tests');
    },
  },
});
mock.module('../../src/context/CartContext.tsx', {
  namedExports: {
    useCart: () => ({ totalItems: 1, state: { items: [{ id: 'product-1', quantity: 1 }] } }),
  },
});
mock.module('../../src/context/ShippingContext.tsx', {
  namedExports: {
    useShipping: () => ({ shippingData: shippingDefaults, setShippingData: () => {} }),
  },
});
mock.module('../../src/hooks/useCustomerProfile.ts', {
  namedExports: { useCustomerProfile: () => ({ customer: null }) },
});
mock.module('../../src/hooks/useStaffAccess.ts', {
  namedExports: {
    useStaffAccess: () => ({
      isLoading: false, isAuthenticated: false, role: null, homePath: null,
    }),
  },
});
mock.module('../../src/hooks/useSiteAssets.ts', {
  namedExports: { useSiteAssets: () => ({ assets: [], loading: false }) },
});
mock.module('../../src/components/SettingsMenu/SettingsMenu.tsx', {
  namedExports: { SettingsMenu: () => null },
});

const { Header } = await import('../../src/components/Header/Header');
const { Footer } = await import('../../src/components/Footer/Footer');
const { Layout } = await import('../../src/components/Layout/Layout');
const { Login } = await import('../../src/pages/Login/Login');
const { AdminLogin } = await import('../../src/pages/Admin/AdminLogin');
const { Shipping } = await import('../../src/pages/Shipping/Shipping');
const { AdminProducts } = await import('../../src/pages/Admin/Products/AdminProducts');
const { AdminCategories } = await import('../../src/pages/Admin/Categories/AdminCategories');

beforeEach(async () => {
  shippingDefaults = null;
  await i18n.changeLanguage('ro');
});

it('CardTitle keeps its div/ref API and explicitly uses the brand serif font', () => {
  const ref = createRef<HTMLDivElement>();
  render(<CardTitle ref={ref}>Titlu <span>moștenit</span></CardTitle>);
  assert.equal(ref.current?.tagName, 'DIV');
  assert.ok(ref.current?.classList.contains('font-serif'));
  assert.ok(ref.current?.classList.contains('font-semibold'));
  assert.equal(ref.current?.querySelector('span')?.className, '');
});

it('body and form fonts inherit without overriding heading descendants, with opt-in reduced motion', () => {
  const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /body\s*\{[^}]*font-family:\s*"Inter", sans-serif;/);
  assert.doesNotMatch(css, /(?:^|\n)\*\s*\{[^}]*font-family:/);
  assert.match(css, /button,\s*input,\s*select,\s*textarea\s*\{\s*font-family:\s*inherit;/);
  assert.match(css, /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{\s*font-family:\s*"Playfair Display", serif;/);
  assert.match(css, /html\s*\{\s*scroll-behavior:\s*smooth;/);
  const reducedMotion = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(reducedMotion, /scroll-behavior:\s*auto/);
  assert.match(reducedMotion, /\*,\s*\*::before,\s*\*::after/);
  assert.match(reducedMotion, /animation-duration:\s*0\.01ms !important/);
  assert.match(reducedMotion, /animation-iteration-count:\s*1 !important/);
  assert.match(reducedMotion, /transition-duration:\s*0\.01ms !important/);
});

it('customer and staff Clerk titles use serif with matching stone light/dark card overrides', () => {
  const customer = render(<MemoryRouter><Login /></MemoryRouter>);
  assert.ok(screen.getByRole('heading', { name: 'Conectare Clerk' }).classList.contains('font-serif'));
  const customerCardClasses = screen.getByTestId('signin-card').className;
  customer.unmount();
  render(<MemoryRouter><AdminLogin /></MemoryRouter>);
  assert.ok(screen.getByRole('heading', { name: 'Conectare Clerk' }).classList.contains('font-serif'));
  assert.equal(screen.getByTestId('signin-card').className, customerCardClasses);
  for (const className of ['bg-white', 'dark:bg-black', 'border-stone-200', 'dark:border-stone-700']) {
    assert.ok(screen.getByTestId('signin-card').classList.contains(className));
  }
});

it('each desktop current route stays in navigation, highlighted, with aria-current', () => {
  for (const [path, name] of [
    ['/', 'Acasă'], ['/products', 'Produse'], ['/catalog', 'La comandă'], ['/servicii', 'Servicii'],
    ['/servicii/prelucrare-cnc-lemn', 'Servicii'],
  ]) {
    const view = render(<MemoryRouter initialEntries={[path]}><Header logoSrc="/logo.svg" /></MemoryRouter>);
    const current = screen.getByRole('link', { name });
    assert.equal(current.getAttribute('aria-current'), 'page');
    assert.ok(current.classList.contains('bg-stone-100'));
    assert.ok(current.classList.contains('dark:bg-stone-800'));
    assert.equal(document.querySelectorAll('a[aria-current="page"]').length, 1);
    assert.equal(screen.getAllByRole('link').length, 5);
    view.unmount();
  }
});

it('the responsive sheet keeps the current route highlighted and closes when a link is selected', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/products']}><Header logoSrc="/logo.svg" /></MemoryRouter>);
  await user.click(screen.getByRole('button', { name: 'Meniu' }));
  const sheet = await screen.findByRole('dialog');
  assert.equal(within(sheet).getByRole('link', { name: 'Produse' }).getAttribute('aria-current'), 'page');
  assert.equal(within(sheet).getAllByRole('link').length, 4);
  await user.click(within(sheet).getByRole('link', { name: 'Acasă' }));
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
});

it('footer social icons have names and decorative SVGs, and contacts are actionable links', () => {
  render(<MemoryRouter><Footer /></MemoryRouter>);
  for (const name of ['Facebook', 'Instagram', 'TikTok']) {
    const link = screen.getByRole('link', { name });
    assert.equal(link.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
    assert.ok(link.classList.contains('text-muted-foreground'));
    assert.ok(link.classList.contains('hover:text-amber-400'));
    assert.ok(link.classList.contains('dark:hover:text-amber-400'));
  }
  assert.equal(screen.getByRole('link', { name: 'hawaiisibiu@gmail.com' }).getAttribute('href'), 'mailto:hawaiisibiu@gmail.com');
  assert.equal(screen.getByRole('link', { name: '+40 748 831 477' }).getAttribute('href'), 'tel:+40748831477');
});

it('localized skip link is first in keyboard order and targets a focusable main', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<h1>Conținut</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  const skip = screen.getByRole('link', { name: 'Sari la conținutul principal' });
  await user.tab();
  assert.equal(document.activeElement, skip);
  assert.equal(skip.getAttribute('href'), '#main-content');
  assert.ok(skip.classList.contains('focus:not-sr-only'));
  const main = screen.getByRole('main');
  assert.equal(main.id, 'main-content');
  assert.equal(main.getAttribute('tabindex'), '-1');
  main.focus();
  assert.equal(document.activeElement, main);
  await act(async () => { await i18n.changeLanguage('en'); });
  assert.ok(screen.getByRole('link', { name: 'Skip to main content' }));
  await act(async () => { await i18n.changeLanguage('de'); });
  assert.ok(screen.getByRole('link', { name: 'Zum Hauptinhalt springen' }));
});

it('product and category responsive column headers match cell visibility', () => {
  const products = render(<MemoryRouter><AdminProducts /></MemoryRouter>);
  const categoryHead = screen.getByRole('columnheader', { name: 'Categorie' });
  const stockHead = screen.getByRole('columnheader', { name: 'Stoc' });
  const row = screen.getByRole('row', { name: /Platou din lemn/ });
  const cells = within(row).getAllByRole('cell');
  for (const element of [categoryHead, cells[2]]) {
    assert.ok(element.classList.contains('hidden'));
    assert.ok(element.classList.contains('md:table-cell'));
  }
  for (const element of [stockHead, cells[4]]) {
    assert.ok(element.classList.contains('hidden'));
    assert.ok(element.classList.contains('lg:table-cell'));
  }
  products.unmount();
  render(<MemoryRouter><AdminCategories /></MemoryRouter>);
  for (const element of [
    screen.getByRole('columnheader', { name: 'Produse' }),
    screen.getByRole('cell', { name: '1' }),
  ]) {
    assert.ok(element.classList.contains('hidden'));
    assert.ok(element.classList.contains('md:table-cell'));
  }
});

it('primary admin headings share responsive serif typography, keeping compact POS sizing', () => {
  const visit = (directory: URL): URL[] => readdirSync(directory, { withFileTypes: true })
    .flatMap((entry): URL[] => {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      return entry.isDirectory() ? visit(url) : entry.name.endsWith('.tsx') ? [url] : [];
    });
  const files = visit(new URL('../../src/pages/Admin/', import.meta.url));
  let headingCount = 0;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /dark:[\w-]+\d(?:sm:|md:|lg:|hover:)/, file.pathname);
    assert.doesNotMatch(source, /dark:hover:[\w-]+:(?=["'\s])/, file.pathname);
    for (const match of source.matchAll(/<h1 className="([^"]+)"/g)) {
      const classes = match[1].split(/\s+/);
      for (const className of ['font-serif', 'font-medium', 'text-2xl']) {
        assert.ok(classes.includes(className), `${file.pathname}: ${className}`);
      }
      if (!file.pathname.endsWith('/PointOfSale/PointOfSale.tsx')) {
        assert.ok(classes.includes('md:text-3xl'), file.pathname);
      }
      headingCount++;
    }
  }
  assert.ok(headingCount >= 20);
});

it('shipping contact, account and native address controls expose localized placeholders and autofill hints', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><Shipping /></MemoryRouter>);
  for (const [id, autocomplete] of [
    ['email', 'email'], ['phone', 'tel'], ['firstName', 'given-name'], ['lastName', 'family-name'],
    ['shippingStreet', 'shipping street-address'],
    ['shippingCity', 'shipping address-level2'], ['shippingPostalCode', 'shipping postal-code'],
  ]) {
    assert.equal(document.getElementById(id)?.getAttribute('autocomplete'), autocomplete, id);
  }
  assert.ok(screen.getByPlaceholderText('adresa@exemplu.ro'));
  assert.ok(screen.getByPlaceholderText('Prenume'));
  assert.ok(screen.getByPlaceholderText('Nume'));
  assert.equal(screen.queryByPlaceholderText('Street address'), null);
  await user.click(document.getElementById('shippingCountry') as HTMLElement);
  await waitFor(() =>
    assert.deepEqual(
      screen.getAllByRole('option').map((option) => option.textContent),
      ['Selectează...', 'România'],
    ),
  );
  await user.keyboard('{Escape}');
  await user.click(screen.getByRole('checkbox', { name: 'Aceeași cu adresa de livrare' }));
  await pickOption(user, document.getElementById('billingCountry') as HTMLElement, 'Germany');
  for (const [id, autocomplete] of [
    ['billingStreet', 'billing street-address'],
    ['billingCounty', 'billing address-level1'], ['billingCity', 'billing address-level2'],
    ['billingPostalCode', 'billing postal-code'],
  ]) {
    assert.equal(document.getElementById(id)?.getAttribute('autocomplete'), autocomplete, id);
  }
  assert.equal(
    (document.querySelector('select[name="billingAddress.country"]') as HTMLSelectElement).getAttribute('autocomplete'),
    'billing country-name',
  );
  await user.click(screen.getByRole('checkbox', { name: 'Doresc să îmi creez un cont pentru comenzi viitoare' }));
  assert.equal(screen.getByLabelText(/Parolă/).getAttribute('autocomplete'), 'new-password');
  assert.equal(document.querySelector('input[type="checkbox"][required]'), null);
});

it('shipping validation connects each invalid native input to its own error text and clears corrected errors', async () => {
  shippingDefaults = {
    email: '', phone: '', firstName: '', lastName: '', password: '',
    shippingAddress: { street: '', city: '', county: '', postalCode: '', country: 'Germany' },
    billingAddress: { street: '', city: '', county: '', postalCode: '', country: 'Germany' },
    sameAsShipping: false, newsletter: false, acceptPolicy: false, createAccount: false,
  };
  const user = userEvent.setup();
  render(<MemoryRouter><Shipping /></MemoryRouter>);
  assert.equal(screen.getByLabelText(/Email/).getAttribute('aria-invalid'), null);
  await user.click(screen.getByRole('button', { name: 'Continuă spre plată' }));
  await waitFor(() => assert.equal(screen.getByLabelText(/Email/).getAttribute('aria-invalid'), 'true'));
  const ids = new Set<string>();
  for (const id of ['email', 'phone', 'firstName', 'lastName', 'shippingStreet', 'shippingCounty', 'shippingCity', 'billingStreet', 'billingCounty', 'billingCity']) {
    const input = document.getElementById(id);
    assert.equal(input?.getAttribute('aria-invalid'), 'true', id);
    const errorId = input?.getAttribute('aria-describedby');
    assert.ok(errorId, id);
    assert.ok(document.getElementById(errorId)?.textContent, id);
    assert.ok(!ids.has(errorId), id);
    ids.add(errorId);
  }
  const policy = screen.getByRole('checkbox', { name: /Am citit și accept/ });
  assert.equal(policy.getAttribute('aria-invalid'), 'true');
  assert.equal(policy.getAttribute('aria-describedby'), 'acceptPolicy-error');
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'client@exemplu.ro' } });
  fireEvent.blur(screen.getByLabelText(/Email/));
  await waitFor(() => assert.equal(screen.getByLabelText(/Email/).getAttribute('aria-invalid'), null));
  assert.equal(screen.getByLabelText(/Email/).getAttribute('aria-describedby'), null);
});

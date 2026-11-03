import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { RequestForQueries } from 'convex/react';
import type { ShippingFormData } from '../../src/types/shipping.types';

type Confirmation = { state: 'pending' | 'confirmed' | 'review' | 'cancelled' };
let result: Confirmation | null | undefined | Error;
let clearCalls = 0;
let itemCount = 1;
let queryRequests: RequestForQueries = {};
let language = 'ro';
let shippingData: ShippingFormData;
let profilePrefill = false;
const action = mock.fn<(args: unknown) => Promise<{ url: null }>>(async () => ({ url: null }));
const saveProfile = mock.fn<(args: unknown) => Promise<void>>(async () => {});

mock.module('react-i18next', { namedExports: {
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    i18n: { language, resolvedLanguage: language },
  }),
} });
mock.module('convex/react', { namedExports: {
  useQueries: (queries: RequestForQueries) => {
    queryRequests = queries;
    return Object.keys(queries).length ? { data: result } : {};
  },
  useAction: () => action,
  useMutation: () => saveProfile,
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
} });
mock.module('@clerk/clerk-react', { namedExports: {
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useSignUp: () => ({ isLoaded: true, signUp: null, setActive: async () => {} }),
} });
mock.module('../../src/context/CartContext.tsx', { namedExports: {
  useCart: () => ({
    state: { items: itemCount ? [{ id: 'product', name: 'Product', price: 25, quantity: itemCount }] : [] },
    clearCart: () => { clearCalls++; itemCount = 0; },
  }),
} });
mock.module('../../src/context/ShippingContext.tsx', { namedExports: {
  useShipping: () => ({ shippingData: profilePrefill ? null : shippingData, setShippingData: () => {} }),
} });
mock.module('../../src/hooks/useCustomerProfile.ts', { namedExports: {
  useCustomerProfile: () => ({
    customer: profilePrefill ? { ...shippingData, newsletter: false } : null,
  }),
} });
const { ThankYou } = await import('../../src/pages/ThankYou/ThankYou');
const { Checkout } = await import('../../src/pages/Checkout/Checkout');
const { Shipping } = await import('../../src/pages/Shipping/Shipping');

const sessionId = `cs_test_${'A'.repeat(32)}`;
const Navigation = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(`/thank-you?session_id=cs_test_${'B'.repeat(32)}`)}>Another confirmation</button>;
};
const tree = (path = `/thank-you?session_id=${sessionId}`) => (
  <StrictMode>
    <MemoryRouter initialEntries={[path]}>
      <ThankYou />
      <Navigation />
    </MemoryRouter>
  </StrictMode>
);
beforeEach(() => {
  result = undefined;
  clearCalls = 0;
  itemCount = 1;
  language = 'ro';
  queryRequests = {};
  profilePrefill = false;
  action.mock.resetCalls();
  saveProfile.mock.resetCalls();
  const address = { street: 'Street 1', city: 'Sibiu', county: 'Sibiu', postalCode: '550000', country: 'România' };
  shippingData = {
    email: 'buyer@example.test', firstName: 'Buyer', lastName: 'Example', phone: '+40712345678',
    shippingAddress: address, billingAddress: { ...address, street: 'Billing 2' },
    sameAsShipping: false, newsletter: false, acceptPolicy: true, createAccount: false,
  };
});

test('direct, invalid and forged thank-you links never claim success or clear cart', () => {
  result = { state: 'confirmed' };
  for (const path of ['/thank-you', '/thank-you?session_id=forged', '/thank-you?session_id=cs_test_short', `/thank-you?session_id=${sessionId}&session_id=${sessionId}`]) {
    const view = render(tree(path));
    assert.ok(screen.getByRole('heading', { name: 'Plata nu este confirmată' }));
    assert.ok(screen.getByRole('status').textContent?.includes('nu plăti din nou'));
    assert.deepEqual(queryRequests, {});
    assert.equal(clearCalls, 0);
    assert.equal(itemCount, 1);
    view.unmount();
  }
});

test('loading, unknown-session null and read errors stay unconfirmed and preserve the cart', () => {
  for (const value of [undefined, null, new Error('Backend unavailable')]) {
    result = value;
    const view = render(tree());
    assert.ok(screen.getByRole('heading', { name: 'Plata nu este confirmată' }));
    assert.deepEqual(queryRequests.data.args, { sessionId });
    assert.equal(clearCalls, 0);
    assert.equal(itemCount, 1);
    view.unmount();
  }
});

test('pending confirmation says wait without asking for payment again and updates reactively', () => {
  result = { state: 'pending' };
  const view = render(tree());
  assert.ok(screen.getByRole('heading', { name: 'Confirmarea plății este în așteptare' }));
  assert.ok(screen.getByRole('status').textContent?.includes('Nu plăti din nou'));
  assert.equal(clearCalls, 0);
  result = { state: 'confirmed' };
  view.rerender(tree());
  assert.ok(screen.getByRole('heading', { name: 'Plată confirmată' }));
  assert.equal(clearCalls, 1);
});

test('confirmed clears exactly once in StrictMode and never clears subsequently added cart items on rerenders', () => {
  result = { state: 'confirmed' };
  const view = render(tree());
  assert.equal(clearCalls, 1);
  assert.equal(itemCount, 0);
  itemCount = 3;
  view.rerender(tree());
  result = { state: 'pending' };
  view.rerender(tree());
  result = { state: 'confirmed' };
  view.rerender(tree());
  result = { state: 'review' };
  view.rerender(tree());
  assert.equal(clearCalls, 1);
  assert.equal(itemCount, 3);
});

test('paid needs-review clears once but never claims readiness for shipping', () => {
  result = { state: 'review' };
  const view = render(tree());
  assert.ok(screen.getByRole('heading', { name: 'Plată primită — comanda necesită verificare' }));
  assert.ok(screen.getByRole('status').textContent?.includes('nu este pregătită pentru expediere'));
  assert.equal(clearCalls, 1);
  itemCount = 2;
  view.rerender(tree());
  assert.equal(clearCalls, 1);
  assert.equal(itemCount, 2);
});

test('unpaid cancellation never clears cart', () => {
  result = { state: 'cancelled' };
  render(tree());
  assert.ok(screen.getByRole('heading', { name: 'Comandă anulată — plată neconfirmată' }));
  assert.equal(clearCalls, 0);
  assert.equal(itemCount, 1);
});

test('clear-once guard is keyed by session rather than query render identity', () => {
  result = { state: 'confirmed' };
  render(tree());
  assert.equal(clearCalls, 1);
  itemCount = 2;
  fireEvent.click(screen.getByRole('button', { name: 'Another confirmation' }));
  assert.equal(clearCalls, 2);
  assert.deepEqual(queryRequests.data.args, { sessionId: `cs_test_${'B'.repeat(32)}` });
});

test('English and German confirmations have inline translated safety guidance', () => {
  for (const [locale, expected] of [['en', 'Payment confirmation pending'], ['de', 'Zahlungsbestätigung ausstehend']]) {
    language = locale;
    result = { state: 'pending' };
    const view = render(tree());
    assert.ok(screen.getByRole('heading', { name: expected }));
    assert.equal(clearCalls, 0);
    view.unmount();
  }
});

test('Checkout sends phone and separate billing address and clearly marks TEST tariff pending', async () => {
  const previousAlert = globalThis.alert;
  globalThis.alert = () => {};
  try {
    render(<MemoryRouter><Checkout /></MemoryRouter>);
    assert.ok(screen.getByRole('status').textContent?.includes('Tariful transportului nu este încă stabilit'));
    assert.ok(screen.getByText('Subtotal produse'));
    fireEvent.click(screen.getByRole('button', { name: 'Plătește cu cardul' }));
    await waitFor(() => assert.equal(action.mock.callCount(), 1));
    const sent = action.mock.calls[0].arguments[0] as { customer: { phone: string; billingAddress: { street: string } } };
    assert.equal(sent.customer.phone, shippingData.phone);
    assert.equal(sent.customer.billingAddress.street, 'Billing 2');
    assert.equal(clearCalls, 0);
  } finally {
    globalThis.alert = previousAlert;
  }
});

test('saved international shipping requires correction and cannot start payment', () => {
  shippingData.shippingAddress = { ...shippingData.shippingAddress, country: 'Germany' };
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  const button = screen.getByRole('button', { name: 'Plătește cu cardul' }) as HTMLButtonElement;
  assert.equal(button.disabled, true);
  assert.ok(screen.getByRole('alert').textContent?.includes('Livrăm doar în România'));
  assert.equal(screen.getByRole('link', { name: 'Corectează datele de livrare' }).getAttribute('href'), '/shipping');
  fireEvent.click(button);
  assert.equal(action.mock.callCount(), 0);
});

test('Shipping prefills the stored customer phone and retains Romania-only delivery options', async () => {
  profilePrefill = true;
  render(<MemoryRouter><Shipping /></MemoryRouter>);
  await waitFor(() => assert.equal((screen.getByLabelText(/Telefon/) as HTMLInputElement).value, '+40712345678'));
  const countries = document.getElementById('shippingCountry') as HTMLSelectElement;
  assert.deepEqual(Array.from(countries.options).map((option) => option.value), ['', 'România']);
  assert.ok(screen.getByRole('status').textContent?.includes('Costul transportului nu este încă stabilit'));
});

test('Shipping saves a trimmed phone with the profile, while an incompatible saved country is not silently converted', async () => {
  shippingData.phone = '  +40712345678  ';
  const view = render(<MemoryRouter><Shipping /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Continuă spre plată' }));
  await waitFor(() => assert.equal(saveProfile.mock.callCount(), 1));
  assert.equal((saveProfile.mock.calls[0].arguments[0] as { phone: string }).phone, '+40712345678');
  view.unmount();
  saveProfile.mock.resetCalls();
  shippingData.shippingAddress = { ...shippingData.shippingAddress, country: 'Germany' };
  render(<MemoryRouter><Shipping /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Continuă spre plată' }));
  await waitFor(() => assert.equal(document.getElementById('shippingCountry')?.getAttribute('aria-invalid'), 'true'));
  assert.equal(shippingData.shippingAddress.country, 'Germany');
  assert.equal(saveProfile.mock.callCount(), 0);
});

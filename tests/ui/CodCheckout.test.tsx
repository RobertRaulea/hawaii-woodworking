import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getFunctionName } from 'convex/server';
import type { CartItem } from '../../src/context/CartContext';
import type { ShippingFormData } from '../../src/types/shipping.types';

let language = 'ro';
let cartItems: CartItem[] = [];
let shippingData: ShippingFormData | null;
let confirmationResult: unknown = null;
let publicSettings: unknown;
let adminSettings: unknown;
let clearCalls = 0;
const cardAction = mock.fn(async () => ({ url: null }));
let placeCodImpl: (...args: unknown[]) => Promise<unknown> = async () => ({ orderId: 'o1', confirmationToken: 'cod:x' });
let updateSettingsImpl: (...args: unknown[]) => Promise<unknown> = async () => {};
const placeCod = mock.fn((...args: unknown[]) => placeCodImpl(...args));
const updateSettings = mock.fn((...args: unknown[]) => updateSettingsImpl(...args));
const toastSuccess = mock.fn();
const toastError = mock.fn();

mock.module('convex/react', { namedExports: {
  useQueries: () => ({ data: confirmationResult }),
  useAction: () => cardAction,
  useMutation: (ref: unknown) => {
    const name = getFunctionName(ref as never);
    if (name === 'codOrders:placeCodOrder') return placeCod;
    if (name === 'shipping:updateSettings') return updateSettings;
    return async () => {};
  },
  useQuery: (ref: unknown) => {
    const name = getFunctionName(ref as never);
    if (name === 'shipping:getPublicSettings') return publicSettings;
    if (name === 'shipping:getAdminSettings') return adminSettings;
    return undefined;
  },
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
} });
mock.module('@clerk/clerk-react', { namedExports: {
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null }),
  useSignUp: () => ({ isLoaded: true, signUp: null, setActive: async () => {} }),
} });
mock.module('../../src/context/CartContext.tsx', { namedExports: {
  useCart: () => ({ state: { items: cartItems }, clearCart: () => { clearCalls++; } }),
} });
mock.module('../../src/context/ShippingContext.tsx', { namedExports: {
  useShipping: () => ({ shippingData, setShippingData: async () => {} }),
} });
mock.module('../../src/hooks/useCustomerProfile.ts', { namedExports: {
  useCustomerProfile: () => ({ customer: null, isLoading: false, isSignedIn: false }),
} });
mock.module('../../src/utils/analytics.utils.ts', { namedExports: {
  getAnalyticsContext: () => null,
  trackAnalytics: () => {},
} });
mock.module('sonner', { namedExports: {
  toast: { success: toastSuccess, error: toastError },
  Toaster: () => null,
} });
mock.module('react-i18next', { namedExports: {
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: unknown }) =>
      typeof options?.defaultValue === 'string' ? options.defaultValue : _key,
    i18n: { resolvedLanguage: language, language },
  }),
} });

const { Checkout } = await import('../../src/pages/Checkout/Checkout');
const { ThankYou } = await import('../../src/pages/ThankYou/ThankYou');
const { AdminShipping } = await import('../../src/pages/Admin/Shipping/AdminShipping');

const address = { street: 'Street 1', city: 'Sibiu', county: 'Sibiu', postalCode: '550000', country: 'România' };
const defaultSettings = { flatRateCents: 2500, codEnabled: true, codFeeCents: 0 };

beforeEach(() => {
  cleanup();
  language = 'ro';
  cartItems = [{ id: 'product-test', name: 'Demo', price: 25, quantity: 1 } as CartItem];
  shippingData = {
    email: 'buyer@example.test', phone: '+40712345678',
    firstName: 'Buyer', lastName: 'X',
    shippingAddress: address, billingAddress: address,
    sameAsShipping: true, newsletter: false,
    acceptPolicy: true, createAccount: false, password: '',
  } as ShippingFormData;
  confirmationResult = null;
  publicSettings = { ...defaultSettings };
  adminSettings = { settings: { ...defaultSettings }, updatedAt: 1700000000000 };
  clearCalls = 0;
  cardAction.mock.resetCalls();
  placeCod.mock.resetCalls();
  placeCodImpl = async () => ({ orderId: 'o1', confirmationToken: 'cod:x' });
  updateSettings.mock.resetCalls();
  updateSettingsImpl = async () => {};
  toastSuccess.mock.resetCalls();
  toastError.mock.resetCalls();
});

test('Checkout offers card and COD with totals including shipping', async () => {
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  assert.ok(screen.getByRole('radio', { name: 'Card online' }));
  assert.ok(screen.getByRole('radio', { name: /Ramburs/ }));
  assert.ok(screen.getByText('Subtotal produse'));
  assert.ok(screen.getByText('Transport'));
  const amounts = screen.getAllByText('25.00 RON');
  assert.equal(amounts.length >= 2, true); // subtotal + transport
  assert.ok(screen.getByText('Total'));
  assert.ok(screen.getByText('50.00 RON'));
  assert.equal(screen.queryByText('Taxă ramburs'), null);
});

test('free shipping shows Gratuit only when the threshold is reached', () => {
  publicSettings = { ...defaultSettings, freeShippingThresholdCents: 2000 };
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  assert.ok(screen.getByText('Gratuit'));
  cleanup();
  publicSettings = { ...defaultSettings, freeShippingThresholdCents: 3000 };
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  assert.equal(screen.queryByText('Gratuit'), null);
  assert.equal(screen.getAllByText('25.00 RON').length >= 1, true);
});

test('COD hidden when disabled and disabled with explanation over max', () => {
  publicSettings = { ...defaultSettings, codEnabled: false };
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  assert.equal(screen.queryByRole('radio', { name: /Ramburs/ }), null);
  cleanup();
  publicSettings = { ...defaultSettings, codMaxOrderCents: 4000 };
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  const codRadio = screen.getByRole('radio', { name: /Ramburs/ }) as HTMLInputElement;
  assert.equal(codRadio.disabled, true);
  assert.ok(screen.getByText('Ramburs indisponibil peste valoarea maximă.'));
  cleanup();
  // fee row appears only when COD is selected and fee > 0
  publicSettings = { ...defaultSettings, codFeeCents: 500 };
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  assert.equal(screen.queryByText('Taxă ramburs'), null);
  fireEvent.click(screen.getByRole('radio', { name: /Ramburs/ }));
  assert.ok(screen.getByText('Taxă ramburs'));
  assert.ok(screen.getByText('5.00 RON'));
});

test('COD submit reuses the same requestId on retry after failure', async () => {
  let codAttempts = 0;
  placeCodImpl = async () => {
    codAttempts++;
    if (codAttempts === 1) throw new Error('network');
    return { orderId: 'o1', confirmationToken: 'cod:x' };
  };
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  fireEvent.click(screen.getByRole('radio', { name: /Ramburs/ }));
  const button = screen.getByRole('button', { name: 'Plasează comanda cu ramburs' });
  fireEvent.click(button);
  await waitFor(() => assert.equal(placeCod.mock.callCount(), 1));
  assert.equal(toastError.mock.callCount(), 1);
  fireEvent.click(button);
  await waitFor(() => assert.equal(placeCod.mock.callCount(), 2));
  const first = placeCod.mock.calls[0].arguments[0] as { requestId: string };
  const second = placeCod.mock.calls[1].arguments[0] as { requestId: string };
  assert.equal(first.requestId, second.requestId);
  assert.match(first.requestId, /^[a-zA-Z0-9-]{16,100}$/);
});

test('card submit still calls createCheckoutSession', async () => {
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Plătește cu cardul' }));
  await waitFor(() => assert.equal(cardAction.mock.callCount(), 1));
  assert.equal(placeCod.mock.callCount(), 0);
});

test('ThankYou shows the COD confirmation with amount and clears the cart', () => {
  confirmationResult = { state: 'confirmed', paymentMethod: 'cod', total: 75 };
  const sessionId = `cod:${'a'.repeat(20)}`;
  render(<MemoryRouter initialEntries={[`/thank-you?session_id=${sessionId}`]}><ThankYou /></MemoryRouter>);
  assert.ok(screen.getByRole('heading', { name: 'Comandă înregistrată' }));
  assert.ok(screen.getByRole('status').textContent?.includes('75.00 RON'));
  assert.ok(screen.getByRole('status').textContent?.includes('ramburs'));
  assert.equal(clearCalls, 1);
});

test('AdminShipping loads settings, converts RON to cents and saves', async () => {
  render(<MemoryRouter><AdminShipping /></MemoryRouter>);
  assert.equal((screen.getByLabelText(/Tarif transport/) as HTMLInputElement).value, '25.00');
  assert.equal((screen.getByLabelText(/Prag transport gratuit/) as HTMLInputElement).value, '');
  fireEvent.change(screen.getByLabelText(/Tarif transport/), { target: { value: '30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
  await waitFor(() => assert.equal(updateSettings.mock.callCount(), 1));
  const sent = updateSettings.mock.calls[0].arguments[0] as Record<string, unknown>;
  assert.equal(sent.flatRateCents, 3000);
  assert.equal(sent.codFeeCents, 0);
  assert.equal(sent.freeShippingThresholdCents, undefined);
  assert.equal(sent.codMaxOrderCents, undefined);
  assert.equal(sent.codEnabled, true);
  assert.equal(toastSuccess.mock.callCount(), 1);
  assert.ok(screen.getByText(/Salvat/));
});

test('AdminShipping shows validation and disables the button while saving', async () => {
  let resolveSave: (() => void) | undefined;
  updateSettingsImpl = () => new Promise<void>((resolve) => { resolveSave = resolve; });
  render(<MemoryRouter><AdminShipping /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/Tarif transport/), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
  assert.ok(screen.getByRole('alert').textContent?.includes('Tariful de transport'));
  assert.equal(updateSettings.mock.callCount(), 0);
  fireEvent.change(screen.getByLabelText(/Tarif transport/), { target: { value: '20' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
  await waitFor(() => assert.equal((screen.getByRole('button', { name: 'Se salvează...' }) as HTMLButtonElement).disabled, true));
  if (resolveSave) resolveSave();
});

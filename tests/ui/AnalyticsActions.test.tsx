import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AnalyticsContext } from '../../shared/analytics';
import type { ShippingFormData } from '../../src/types/shipping.types';

const track = mock.fn();
const identify = mock.fn();
const contextValue: { current: AnalyticsContext | undefined } = { current: undefined };
const subscribers = new Set<() => void>();
const emit = () => {
  for (const listener of subscribers) listener();
};
let status = {
  consent: 'accepted' as 'pending' | 'accepted' | 'rejected',
  enabled: true,
  ready: true,
  privacyBlocked: false,
  epoch: 1,
};

mock.module(new URL('../../src/utils/analytics.utils.ts', import.meta.url).href, {
  namedExports: {
    initializeAnalytics: async () => {},
    trackAnalytics: track,
    trackAnalyticsPage: () => {},
    identifyAnalytics: identify,
    resetAnalyticsIdentity: () => {},
    getAnalyticsContext: () => contextValue.current,
    getAnalyticsConsent: () => status.consent,
    setAnalyticsConsent: () => {},
    subscribeAnalytics: (listener: () => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    getAnalyticsStatus: () => status,
  },
});

const toast = { success: mock.fn(), error: mock.fn() };
mock.module(new URL('../../src/components/ui/sonner.tsx', import.meta.url).href, {
  namedExports: { toast },
});

// --- Shipping/checkout seams (mirrors CustomerSignup/CheckoutConfirmation) ---
let clerkSignedIn = false;
let verificationComplete = true;
let setActiveCalls = 0;
const verificationUserId: { current: string | undefined } = { current: 'user_2newuser42' };
mock.module('@clerk/clerk-react', {
  namedExports: {
    useAuth: () => ({ isLoaded: true, isSignedIn: clerkSignedIn }),
    useSignUp: () => ({
      isLoaded: true,
      setActive: async () => {
        setActiveCalls += 1;
        clerkSignedIn = true;
      },
      signUp: {
        create: async () => {},
        prepareEmailAddressVerification: async () => {},
        attemptEmailAddressVerification: async () =>
          verificationComplete
            ? { status: 'complete', createdSessionId: 'session-test', createdUserId: verificationUserId.current }
            : { status: 'needs_verification' },
      },
    }),
    SignIn: () => null,
  },
});

const action = mock.fn<(args: unknown) => Promise<{ url: string | null }>>(async () => ({ url: null }));
mock.module('convex/react', {
  namedExports: {
    useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
    useMutation: () => async () => {},
    useAction: () => action,
    useQueries: () => ({}),
  },
});

let savedData: ShippingFormData | null = null;
mock.module('../../src/context/ShippingContext.tsx', {
  namedExports: {
    useShipping: () => ({
      shippingData: shippingForm,
      setShippingData: (value: ShippingFormData) => {
        savedData = value;
      },
    }),
  },
});
mock.module('../../src/hooks/useCustomerProfile.ts', {
  namedExports: { useCustomerProfile: () => ({ customer: null }) },
});

// --- Product detail seams ---
const productState: { data: unknown; error: Error | null } = { data: undefined, error: null };
mock.module('../../src/hooks/useAdminQuery.ts', {
  namedExports: { useAdminQuery: () => ({ data: productState.data, error: productState.error }) },
});
mock.module('../../src/hooks/useProducts.ts', {
  namedExports: { useProducts: () => ({ products: [] }) },
});
mock.module('../../src/hooks/useTranslatedProducts.ts', {
  namedExports: {
    useTranslatedProduct: (p: unknown) => p,
    useTranslatedProducts: (l: unknown) => l,
  },
});
mock.module(new URL('../../src/components/SEO/SEO.tsx', import.meta.url).href, {
  namedExports: { SEO: () => null },
});
mock.module('../../src/components/ProductGallery/index.ts', {
  namedExports: { ProductGallery: () => null },
});
mock.module('../../src/components/ProductCard/index.ts', {
  namedExports: { ProductCard: () => null },
});
mock.module('../../src/context/LanguageContext.tsx', {
  namedExports: { useLanguage: () => ({ language: 'ro', setLanguage: () => {} }) },
});
mock.module('react-i18next', {
  namedExports: {
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
      i18n: { language: 'ro', resolvedLanguage: 'ro' },
    }),
  },
});

const { CartProvider, useCart } = await import('../../src/context/CartContext.tsx');
const { ProductDetailPage } = await import('../../src/pages/ProductDetail/ProductDetailPage.tsx');
const { Checkout } = await import('../../src/pages/Checkout/Checkout.tsx');
const { Shipping } = await import('../../src/pages/Shipping/Shipping.tsx');

const inCart = (children: ReactNode) => <CartProvider>{children}</CartProvider>;

const shippingForm: ShippingFormData = {
  email: 'tester@example.com',
  phone: '0712345678',
  firstName: 'Test',
  lastName: 'Client',
  password: 'Example-long-pass-42!',
  shippingAddress: { street: 'Test Street 1', city: 'Sibiu', county: 'Sibiu', postalCode: '550000', country: 'România' },
  billingAddress: { street: 'Test Street 1', city: 'Sibiu', county: 'Sibiu', postalCode: '550000', country: 'România' },
  sameAsShipping: true,
  newsletter: false,
  acceptPolicy: true,
  createAccount: true,
};

const eventsOf = (name: string) =>
  track.mock.calls.map((c) => c.arguments).filter((a) => a[0] === name);

beforeEach(() => {
  track.mock.resetCalls();
  identify.mock.resetCalls();
  action.mock.resetCalls();
  toast.success.mock.resetCalls();
  toast.error.mock.resetCalls();
  contextValue.current = undefined;
  status = { consent: 'accepted', enabled: true, ready: true, privacyBlocked: false, epoch: 1 };
  localStorage.clear();
  // CartProvider initializes from storage: a non-empty cart is required for
  // shipping/checkout flows under test.
  localStorage.setItem(
    'cart',
    JSON.stringify({
      items: [{ id: 'seed-1', name: 'Seed', price: 25, quantity: 1, image: '/s.jpg', stock: 10, trackStock: true }],
    }),
  );
  clerkSignedIn = false;
  verificationComplete = true;
  setActiveCalls = 0;
  savedData = null;
  productState.data = undefined;
  productState.error = null;
  globalThis.alert = () => {};
});

describe('analytics action instrumentation', () => {
  it('emits add_to_cart with the requested quantity on both successful add branches', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;
    const { result } = renderHook(useCart, { wrapper });
    const item = { id: 'product-1', name: 'Bowl', price: 10, image: '/x.jpg' };
    act(() => {
      assert.equal(result.current.addItem(item, undefined, false, 3), true);
    });
    assert.deepEqual(eventsOf('add_to_cart'), [
      ['add_to_cart', { product_id: 'product-1', quantity: 3, surface: 'storefront' }],
    ]);
    act(() => {
      assert.equal(result.current.addItem(item, 5, true, 2), true);
    });
    assert.deepEqual(eventsOf('add_to_cart').at(-1), [
      'add_to_cart',
      { product_id: 'product-1', quantity: 2, surface: 'storefront' },
    ]);
  });

  it('emits no add_to_cart when stock validation refuses the add', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;
    const { result } = renderHook(useCart, { wrapper });
    act(() => {
      assert.equal(
        result.current.addItem({ id: 'product-1', name: 'Bowl', price: 10, image: '/x.jpg' }, 2, true, 3),
        false,
      );
    });
    assert.equal(eventsOf('add_to_cart').length, 0);
    assert.equal(toast.error.mock.callCount(), 1);
  });

  it('emits product_viewed once per displayed product per consent epoch, never on loading or error', async () => {
    productState.data = {
      _id: 'product-abc123',
      name: 'Masă stejar',
      price: 120,
      imageUrls: ['/a.jpg'],
      availableStock: 9,
      lowStockThreshold: 5,
      trackStock: true,
      category: 'Mobilier',
      description: 'desc',
    };
    render(inCart(
      <StrictMode>
        <MemoryRouter initialEntries={['/product/product-abc123']}>
          <Routes>
            <Route path="/product/:productId" element={<ProductDetailPage />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    ));
    await act(async () => {});
    assert.deepEqual(eventsOf('product_viewed'), [
      ['product_viewed', { product_id: 'product-abc123', surface: 'storefront' }],
    ]);
    // A new consent epoch re-evaluates the displayed product once.
    status = { ...status, epoch: 2 };
    act(() => emit());
    assert.equal(eventsOf('product_viewed').length, 2);

    productState.data = undefined;
    productState.error = new Error('fail');
    render(inCart(
      <MemoryRouter initialEntries={['/product/broken']}>
        <Routes>
          <Route path="/product/:productId" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>,
    ));
    await act(async () => {});
    productState.error = null;
    productState.data = undefined;
    render(inCart(
      <MemoryRouter initialEntries={['/product/loading']}>
        <Routes>
          <Route path="/product/:productId" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>,
    ));
    await act(async () => {});
    assert.equal(eventsOf('product_viewed').length, 2);
  });

  it('emits checkout_started only for a usable Stripe URL and forwards context only when defined', async () => {
    contextValue.current = {
      consent: true,
      distinctId: 'distinct-abc123',
      sessionId: 'session-xyz789',
      environment: 'test',
    };
    action.mock.mockImplementation(async () => ({ url: 'https://checkout.stripe.com/session-1' }));
    const view = render(inCart(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<Checkout />} />
        </Routes>
      </MemoryRouter>));
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Plătește cu cardul' }));
    await act(async () => {});
    assert.deepEqual(eventsOf('checkout_started'), [['checkout_started', { surface: 'checkout' }]]);
    const args = action.mock.calls[0].arguments[0] as Record<string, unknown>;
    assert.deepEqual(args.analytics, contextValue.current);
    view.unmount();

    // Without consent the analytics argument is not transmitted at all.
    contextValue.current = undefined;
    action.mock.resetCalls();
    render(inCart(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<Checkout />} />
        </Routes>
      </MemoryRouter>));
    await act(async () => {});
    fireEvent.click(screen.getAllByRole('button', { name: 'Plătește cu cardul' }).at(-1)!);
    await act(async () => {});
    const args2 = action.mock.calls[0].arguments[0] as Record<string, unknown>;
    assert.equal('analytics' in args2, false);
    assert.equal(eventsOf('checkout_started').length, 2);
  });

  it('emits checkout_initiation_failed with a fixed code on missing URL or action failure', async () => {
    action.mock.mockImplementation(async () => ({ url: null }));
    render(inCart(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<Checkout />} />
        </Routes>
      </MemoryRouter>));
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Plătește cu cardul' }));
    await act(async () => {});
    assert.deepEqual(eventsOf('checkout_initiation_failed'), [
      ['checkout_initiation_failed', { error_code: 'checkout_initiation_failed', surface: 'checkout' }],
    ]);

    for (const bad of ['', '   ', 'not-a-url', 'http://evil.example/x', 'javascript:alert(1)', 'https://user:pw@stripe.com/x']) {
      action.mock.mockImplementation(async () => ({ url: bad }));
      fireEvent.click(screen.getByRole('button', { name: 'Plătește cu cardul' }));
      await act(async () => {});
    }
    assert.equal(eventsOf('checkout_started').length, 0);
    assert.equal(eventsOf('checkout_initiation_failed').length, 1 + 6);

    action.mock.mockImplementation(async () => {
      throw new Error('raw transport detail must not be captured');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Plătește cu cardul' }));
    await act(async () => {});
    assert.equal(eventsOf('checkout_initiation_failed').length, 1 + 6 + 1);
    assert.equal(eventsOf('checkout_started').length, 0);
    const props = eventsOf('checkout_initiation_failed').at(-1)![1] as Record<string, unknown>;
    assert.equal(JSON.stringify(props).includes('raw transport detail'), false);
  });

  it('emits signup_completed only after verified signup completes and setActive succeeds', async () => {
    render(inCart(
      <MemoryRouter initialEntries={['/shipping']}>
        <Routes>
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/checkout" element={<div>checkout</div>} />
        </Routes>
      </MemoryRouter>));
    fireEvent.click(screen.getByRole('button', { name: 'Continuă spre plată' }));
    await screen.findByRole('heading', { name: 'Verifică adresa de email' });
    // Code sent but not yet verified: no signup_completed yet.
    assert.equal(eventsOf('signup_completed').length, 0);
    assert.equal(eventsOf('form_submitted').length, 0);

    fireEvent.change(screen.getByRole('textbox', { name: 'Cod de verificare email' }), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verifică și continuă' }));
    await act(async () => {});
    assert.equal(setActiveCalls, 1);
    assert.deepEqual(identify.mock.calls.map((c) => c.arguments[0]), ['user_2newuser42']);
    assert.deepEqual(eventsOf('signup_completed'), [
      ['signup_completed', { method: 'clerk', surface: 'shipping' }],
    ]);
    assert.deepEqual(eventsOf('form_submitted'), [
      ['form_submitted', { form_name: 'shipping', surface: 'shipping' }],
    ]);
    assert.notEqual(savedData, null);
  });

  it('does not emit signup_completed when verification never completes', async () => {
    verificationComplete = false;
    render(inCart(
      <MemoryRouter initialEntries={['/shipping']}>
        <Routes>
          <Route path="/shipping" element={<Shipping />} />
        </Routes>
      </MemoryRouter>));
    fireEvent.click(screen.getByRole('button', { name: 'Continuă spre plată' }));
    await screen.findByRole('heading', { name: 'Verifică adresa de email' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Cod de verificare email' }), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verifică și continuă' }));
    await act(async () => {});
    assert.equal(setActiveCalls, 0);
    assert.equal(eventsOf('signup_completed').length, 0);
    assert.equal(eventsOf('form_submitted').length, 0);
    assert.equal(identify.mock.calls.length, 0);
  });
});

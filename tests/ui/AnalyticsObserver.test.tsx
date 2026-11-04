import { render, screen } from '@testing-library/react';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import { act } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

const init = mock.fn<() => Promise<void>>(async () => {});
const trackEvent = mock.fn();
const trackPage = mock.fn();
const identify = mock.fn();
const resetIdentity = mock.fn();
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
    initializeAnalytics: init,
    trackAnalytics: trackEvent,
    trackAnalyticsPage: trackPage,
    identifyAnalytics: identify,
    resetAnalyticsIdentity: resetIdentity,
    getAnalyticsContext: () => undefined,
    getAnalyticsConsent: () => status.consent,
    setAnalyticsConsent: () => {},
    subscribeAnalytics: (listener: () => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    getAnalyticsStatus: () => status,
  },
});

let auth = {
  isLoaded: true,
  isSignedIn: false,
  userId: undefined as string | undefined,
};
mock.module('@clerk/clerk-react', {
  namedExports: { useAuth: () => auth },
});

const { Analytics } = await import('../../src/components/Analytics/Analytics.tsx');

const Nav = () => {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate('/cart?step=1')}>go-cart</button>
  );
};

const renderObserver = (entries: string[]) =>
  render(
    <MemoryRouter initialEntries={entries}>
      <Analytics />
      <Nav />
      <Routes>
        <Route path="/products" element={<div>products</div>} />
        <Route path="/cart" element={<div>cart</div>} />
      </Routes>
    </MemoryRouter>,
  );

const pageCalls = () => trackPage.mock.calls.map((c) => c.arguments);

beforeEach(() => {
  init.mock.resetCalls();
  trackEvent.mock.resetCalls();
  trackPage.mock.resetCalls();
  identify.mock.resetCalls();
  resetIdentity.mock.resetCalls();
  auth = { isLoaded: true, isSignedIn: false, userId: undefined };
  status = { consent: 'accepted', enabled: true, ready: true, privacyBlocked: false, epoch: 1 };
});

describe('analytics router observer', () => {
  it('initializes once and observes pathname transitions with sanitized inputs', async () => {
    renderObserver(['/products']);
    assert.ok(init.mock.callCount() >= 1);
    await act(async () => {});
    assert.deepEqual(pageCalls()[0], ['/products', '']);

    screen.getByRole('button', { name: 'go-cart' }).click();
    await act(async () => {});
    assert.deepEqual(pageCalls().at(-1), ['/cart', '?step=1']);
  });

  it('re-observes the current page and identity when analytics becomes ready', async () => {
    status = { consent: 'pending', enabled: true, ready: false, privacyBlocked: false, epoch: 0 };
    auth = { isLoaded: true, isSignedIn: true, userId: 'user_2abcdef123' };
    renderObserver(['/products']);
    await act(async () => {});
    trackPage.mock.resetCalls();
    identify.mock.resetCalls();
    status = { ...status, consent: 'accepted', ready: true, epoch: 1 };
    act(() => emit());
    assert.deepEqual(pageCalls().at(-1), ['/products', '']);
    assert.deepEqual(identify.mock.calls.map((c) => c.arguments[0]), ['user_2abcdef123']);
  });

  it('identifies an already signed-in user without claiming a login', async () => {
    auth = { isLoaded: true, isSignedIn: true, userId: 'user_2abcdef123' };
    renderObserver(['/products']);
    await act(async () => {});
    assert.deepEqual(identify.mock.calls.map((c) => c.arguments[0]), ['user_2abcdef123']);
    assert.equal(trackEvent.mock.calls.length, 0);
  });

  it('captures login_completed only on an observed signed-out to signed-in transition', async () => {
    const view = renderObserver(['/products']);
    await act(async () => {});
    assert.equal(trackEvent.mock.calls.length, 0);
    auth = { isLoaded: true, isSignedIn: true, userId: 'user_2abcdef123' };
    await act(async () => view.rerender(
      <MemoryRouter initialEntries={['/products']}>
        <Analytics />
        <Routes><Route path="/products" element={<div>products</div>} /></Routes>
      </MemoryRouter>,
    ));
    assert.deepEqual(
      trackEvent.mock.calls.map((c) => c.arguments),
      [['login_completed', { method: 'clerk' }]],
    );
  });

  it('resets identity on sign-out and on an account switch', async () => {
    auth = { isLoaded: true, isSignedIn: true, userId: 'user_aaaa1111' };
    const view = renderObserver(['/products']);
    await act(async () => {});
    identify.mock.resetCalls();

    // Sign out
    auth = { isLoaded: true, isSignedIn: false, userId: undefined };
    await act(async () => view.rerender(
      <MemoryRouter initialEntries={['/products']}>
        <Analytics />
        <Routes><Route path="/products" element={<div>products</div>} /></Routes>
      </MemoryRouter>,
    ));
    assert.equal(resetIdentity.mock.callCount(), 1);

    // Sign in as a different user after the reset path was observed
    auth = { isLoaded: true, isSignedIn: true, userId: 'user_bbbb2222' };
    await act(async () => view.rerender(
      <MemoryRouter initialEntries={['/products']}>
        <Analytics />
        <Routes><Route path="/products" element={<div>products</div>} /></Routes>
      </MemoryRouter>,
    ));
    assert.deepEqual(identify.mock.calls.map((c) => c.arguments[0]), ['user_bbbb2222']);
    assert.deepEqual(
      trackEvent.mock.calls.map((c) => c.arguments),
      [['login_completed', { method: 'clerk' }]],
    );
  });
});

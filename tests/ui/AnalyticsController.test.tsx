import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { ANALYTICS_CONSENT_KEY } from '../../shared/analytics';
import type { AnalyticsConfiguration } from '../../shared/analytics';
import { createAnalyticsController } from '../../src/utils/analyticsController.utils';
import type {
  AnalyticsControllerDeps,
  AnalyticsSdk,
} from '../../src/utils/analyticsController.utils';

const CONFIG: AnalyticsConfiguration = {
  projectToken: 'phc_1234567890abcdef',
  host: 'https://eu.i.posthog.com',
  environment: 'test',
};

type FakeSdk = AnalyticsSdk & { calls: unknown[][]; configs: Record<string, unknown>[] };

const makeSdk = (onCapture?: () => void): FakeSdk => {
  const calls: unknown[][] = [];
  const configs: Record<string, unknown>[] = [];
  return {
    calls,
    configs,
    init: (token: string, config?: Record<string, unknown>) => {
      calls.push(['init', token, config]);
      if (config) configs.push(config);
      (config?.loaded as (() => void) | undefined)?.();
    },
    set_config: (config: Record<string, unknown>) => {
      calls.push(['set_config', config]);
      configs.push(config);
    },
    capture: (event: string, properties?: unknown) => {
      calls.push(['capture', event, properties]);
      onCapture?.();
    },
    identify: (id: string) => {
      calls.push(['identify', id]);
    },
    reset: () => {
      calls.push(['reset']);
    },
    opt_in_capturing: () => {
      calls.push(['opt_in']);
    },
    opt_out_capturing: () => {
      calls.push(['opt_out']);
    },
    get_distinct_id: () => 'distinct-abc123',
    get_session_id: () => 'session-xyz789',
  };
};

const makeStorage = () => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
};

const flush = async (ticks = 10): Promise<void> => {
  for (let i = 0; i < ticks; i += 1) await Promise.resolve();
};

interface Harness {
  controller: ReturnType<typeof createAnalyticsController>;
  sdk: FakeSdk;
  storage: ReturnType<typeof makeStorage>;
  state: {
    enabled: boolean;
    dev: boolean;
    signal: boolean;
    config: AnalyticsConfiguration | null;
    configError: Error | null;
  };
  loadCalls: { count: number };
  storageListeners: Array<() => void>;
  deferredSdk: { resolve: (sdk: FakeSdk) => void; promise: Promise<FakeSdk> } | null;
  clock: { value: number };
}

const makeController = (overrides: {
  enabled?: boolean;
  dev?: boolean;
  signal?: boolean;
  config?: AnalyticsConfiguration | null;
  configError?: Error | null;
  deferred?: boolean;
  brokenStorage?: boolean;
  now?: number;
  seedStorage?: Record<string, string>;
  onCapture?: () => void;
} = {}): Harness => {
  const sdk = makeSdk(overrides.onCapture);
  const storage = makeStorage();
  for (const [key, value] of Object.entries(overrides.seedStorage ?? {})) {
    storage.map.set(key, value);
  }
  const clock = { value: overrides.now ?? Date.now() };
  const storageListeners: Array<() => void> = [];
  const state = {
    enabled: overrides.enabled ?? true,
    dev: overrides.dev ?? false,
    signal: overrides.signal ?? false,
    config: 'config' in overrides ? overrides.config! : CONFIG,
    configError: overrides.configError ?? null,
  };
  const loadCalls = { count: 0 };
  let deferredSdk: Harness['deferredSdk'] = null;
  let resolveDeferred!: (sdk: FakeSdk) => void;
  if (overrides.deferred) {
    const promise = new Promise<FakeSdk>((resolve) => {
      resolveDeferred = resolve;
    });
    deferredSdk = { resolve: resolveDeferred, promise };
  }
  const deps: AnalyticsControllerDeps = {
    isExplicitlyEnabled: () => state.enabled,
    readConfiguration: () => {
      if (state.configError) throw state.configError;
      return state.config;
    },
    loadSdk: () => {
      loadCalls.count += 1;
      return deferredSdk ? deferredSdk.promise : Promise.resolve(sdk);
    },
    isDev: () => state.dev,
    privacySignal: () => state.signal,
    getStorage: () => {
      if (overrides.brokenStorage) throw new Error('storage denied');
      return storage;
    },
    subscribeStorage: (listener) => {
      storageListeners.push(listener);
      return () => {};
    },
    now: () => clock.value,
  };
  const controller = createAnalyticsController(deps);
  return { controller, sdk, storage, state, loadCalls, storageListeners, deferredSdk, clock };
};

const captures = (sdk: FakeSdk) => sdk.calls.filter((c) => c[0] === 'capture');

describe('analytics controller', () => {
  it('does nothing when analytics is not explicitly enabled', async () => {
    const { controller, sdk } = makeController({ enabled: false });
    await controller.initialize();
    controller.setConsent('accepted');
    await flush();
    assert.equal(sdk.calls.length, 0);
    assert.equal(controller.getStatus().enabled, false);
    controller.track('add_to_cart', { product_id: 'product-1', quantity: 1 });
    assert.equal(captures(sdk).length, 0);
  });

  it('reports the prescribed configuration error once in dev and stays usable', async () => {
    const error = new Error(
      'VITE_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_KEY is configured',
    );
    const errorSpy = mock.method(console, 'error', () => {});
    try {
      const { controller, sdk, loadCalls } = makeController({ dev: true, configError: error });
      await controller.initialize();
      controller.setConsent('accepted');
      await flush();
      await controller.initialize();
      assert.equal(errorSpy.mock.callCount(), 1);
      assert.equal(errorSpy.mock.calls[0].arguments[0], error);
      assert.equal(loadCalls.count, 0);
      assert.equal(sdk.calls.length, 0);
      // Storefront still works: the status flags enabled for the consent UI
      // diagnostic while capture stays inert.
      assert.equal(controller.getStatus().enabled, true);
      assert.equal(controller.getStatus().ready, false);
      controller.track('cart_viewed', { surface: 'storefront' });
      assert.equal(captures(sdk).length, 0);
    } finally {
      errorSpy.mock.restore();
    }
  });

  it('stays silent for the same configuration error outside dev', async () => {
    const errorSpy = mock.method(console, 'error', () => {});
    try {
      const { controller } = makeController({
        dev: false,
        configError: new Error('VITE_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_HOST is configured'),
      });
      await controller.initialize();
      assert.equal(errorSpy.mock.callCount(), 0);
    } finally {
      errorSpy.mock.restore();
    }
  });

  it('loads and initializes the SDK once after explicit acceptance', async () => {
    const { controller, sdk, loadCalls } = makeController();
    assert.equal(controller.getConsent(), 'pending');
    controller.setConsent('accepted');
    await flush();
    const inits = sdk.calls.filter((c) => c[0] === 'init');
    assert.equal(inits.length, 1);
    assert.equal(inits[0][1], 'phc_1234567890abcdef');
    const options = inits[0][2] as Record<string, unknown>;
    // Lead-authored options are passed through as the SDK configuration.
    assert.equal(options.api_host, 'https://eu.i.posthog.com');
    assert.equal(options.capture_pageview, false);
    assert.equal(options.autocapture, false);
    assert.equal(options.disable_session_recording, true);
    assert.equal(options.opt_out_capturing_by_default, true);
    assert.equal(typeof options.before_send, 'function');
    assert.ok(sdk.calls.some((c) => c[0] === 'opt_in'));
    assert.equal(controller.getStatus().ready, true);
    await controller.initialize();
    assert.equal(sdk.calls.filter((c) => c[0] === 'init').length, 1);
    assert.equal(loadCalls.count, 1);
  });

  it('never loads the SDK on rejection or when DNT/GPC is signaled', async () => {
    const rejected = makeController();
    rejected.controller.setConsent('rejected');
    await flush();
    assert.equal(rejected.sdk.calls.length, 0);
    assert.equal(rejected.controller.getConsent(), 'rejected');

    const signaled = makeController({ signal: true });
    signaled.controller.setConsent('accepted');
    await flush();
    assert.equal(signaled.sdk.calls.length, 0);
    assert.equal(signaled.controller.getStatus().privacyBlocked, true);
  });

  it('prevents initialization when consent is revoked during the deferred SDK import', async () => {
    const { controller, sdk, deferredSdk } = makeController({ deferred: true });
    controller.setConsent('accepted');
    controller.setConsent('rejected');
    deferredSdk!.resolve(sdk);
    await flush();
    assert.equal(sdk.calls.filter((c) => c[0] === 'init').length, 0);
    assert.equal(controller.getStatus().ready, false);
  });

  it('drops pending events and clears SDK identifiers on rejection', async () => {
    const { controller, sdk, deferredSdk } = makeController({ deferred: true });
    controller.setConsent('accepted');
    controller.track('add_to_cart', { product_id: 'product-1', quantity: 2 });
    controller.setConsent('rejected');
    deferredSdk!.resolve(sdk);
    await flush();
    assert.equal(captures(sdk).length, 0);
    assert.equal(controller.getContext(), undefined);
  });

  it('opts out and resets the SDK when consent is withdrawn after acceptance', async () => {
    const { controller, sdk } = makeController();
    controller.setConsent('accepted');
    await flush();
    assert.equal(controller.getStatus().ready, true);
    assert.notEqual(controller.getContext(), undefined);
    controller.setConsent('rejected');
    assert.ok(sdk.calls.some((c) => c[0] === 'opt_out'));
    assert.ok(sdk.calls.some((c) => c[0] === 'reset'));
    assert.equal(controller.getStatus().ready, false);
    assert.equal(controller.getContext(), undefined);
    controller.track('add_to_cart', { product_id: 'product-1', quantity: 1 });
    assert.equal(captures(sdk).length, 0);
  });

  it('reflects a cross-tab revocation through the storage listener', async () => {
    const { controller, sdk, storage, storageListeners } = makeController();
    controller.setConsent('accepted');
    await flush();
    assert.equal(controller.getStatus().ready, true);
    storage.map.set(
      ANALYTICS_CONSENT_KEY,
      JSON.stringify({ version: 1, choice: 'rejected', updatedAt: Date.now() }),
    );
    storageListeners[0]();
    assert.equal(controller.getConsent(), 'rejected');
    assert.equal(controller.getStatus().ready, false);
    assert.ok(sdk.calls.some((c) => c[0] === 'opt_out'));
    assert.ok(sdk.calls.some((c) => c[0] === 'reset'));
  });

  it('survives unavailable storage and keeps consent in memory', async () => {
    const { controller, sdk } = makeController({ brokenStorage: true });
    controller.setConsent('accepted');
    await flush();
    assert.equal(controller.getConsent(), 'accepted');
    assert.ok(sdk.calls.some((c) => c[0] === 'init'));
  });

  it('never replays actions taken before consent', async () => {
    const { controller, sdk } = makeController();
    controller.track('add_to_cart', { product_id: 'product-1', quantity: 1 });
    controller.trackPage('/cart', '');
    controller.identify('user_abc12345');
    controller.setConsent('accepted');
    await flush();
    assert.equal(captures(sdk).length, 0);
    assert.equal(sdk.calls.filter((c) => c[0] === 'identify').length, 0);
  });

  it('captures queued post-consent events once ready', async () => {
    const { controller, sdk, deferredSdk } = makeController({ deferred: true });
    controller.setConsent('accepted');
    controller.track('add_to_cart', { product_id: 'product-1', quantity: 2 });
    deferredSdk!.resolve(sdk);
    await flush();
    assert.deepEqual(captures(sdk), [['capture', 'add_to_cart', { product_id: 'product-1', quantity: 2 }]]);
  });

  it('identifies only valid subjects and resets identity safely', async () => {
    const { controller, sdk } = makeController();
    controller.identify('not valid id!!');
    controller.setConsent('accepted');
    await flush();
    assert.equal(sdk.calls.filter((c) => c[0] === 'identify').length, 0);
    controller.identify('user_2abcdef123');
    assert.deepEqual(sdk.calls.filter((c) => c[0] === 'identify'), [['identify', 'user_2abcdef123']]);
    controller.resetIdentity();
    assert.ok(sdk.calls.some((c) => c[0] === 'reset'));
    controller.resetIdentity();
  });

  it('captures one sanitized pageview per pathname with campaign enums only', async () => {
    const { controller, sdk } = makeController();
    controller.setConsent('accepted');
    await flush();
    controller.trackPage('/product/abc123', '?utm_source=google&utm_medium=weird&search=red');
    controller.trackPage('/product/abc123', '?utm_source=google');
    assert.equal(captures(sdk).length, 1);
    const props = captures(sdk)[0][2] as Record<string, unknown>;
    assert.equal(props.route_path, '/product/:productId');
    assert.equal(props.surface, 'storefront');
    assert.equal(props.utm_source, 'google');
    assert.equal(props.utm_medium, 'other');
    assert.equal('search' in props, false);
    controller.trackPage('/product/def456', '');
    controller.trackPage('/admin/dashboard', '');
    assert.equal(captures(sdk).length, 3);
    assert.equal((captures(sdk)[2][2] as Record<string, unknown>).surface, 'admin');
  });

  it('rejects expired, future-dated and malformed consent records seeded before construction', async () => {
    const now = 1_800_000_000_000;
    const cases: Array<[string, string]> = [
      ['expired', JSON.stringify({ version: 1, choice: 'accepted', updatedAt: now - 181 * 24 * 60 * 60 * 1000 })],
      ['future-dated', JSON.stringify({ version: 1, choice: 'accepted', updatedAt: now + 60_000 })],
      ['json-null', 'null'],
      ['missing-version', JSON.stringify({ choice: 'accepted', updatedAt: now })],
      ['missing-choice', JSON.stringify({ version: 1, updatedAt: now })],
      ['nan-timestamp', '{"version":1,"choice":"accepted","updatedAt":null}'],
      ['string-timestamp', JSON.stringify({ version: 1, choice: 'accepted', updatedAt: 'yesterday' })],
      ['not-json', 'not-json'],
    ];
    for (const [name, raw] of cases) {
      const { controller, sdk, loadCalls } = makeController({
        now,
        seedStorage: { [ANALYTICS_CONSENT_KEY]: raw },
      });
      assert.equal(controller.getConsent(), 'pending', name);
      await controller.initialize();
      assert.equal(loadCalls.count, 0, name);
      assert.equal(sdk.calls.length, 0, name);
    }
  });

  it('keeps a re-accept idempotent: no generation reset, live guard still captures', async () => {
    const { controller, sdk } = makeController();
    controller.setConsent('accepted');
    await flush();
    assert.equal(controller.getStatus().ready, true);
    const beforeSend = sdk.configs[0].before_send as (event: unknown) => unknown;
    const fakeEvent = {
      event: 'add_to_cart',
      properties: {
        distinct_id: 'distinct-abc123',
        product_id: 'product-1',
        $current_url: 'http://localhost/cart?canceled=true',
      },
    };
    assert.notEqual(beforeSend(fakeEvent), null);
    controller.setConsent('accepted');
    // Same generation: the live before_send keeps admitting events and no
    // teardown (opt_out/reset/set_config/init) happened.
    assert.notEqual(beforeSend(fakeEvent), null);
    assert.equal(sdk.calls.filter((c) => c[0] === 'init').length, 1);
    assert.equal(sdk.calls.filter((c) => c[0] === 'set_config').length, 0);
    assert.equal(sdk.calls.some((c) => c[0] === 'opt_out' || c[0] === 'reset'), false);
    controller.track('add_to_cart', { product_id: 'product-1', quantity: 1 });
    assert.equal(captures(sdk).length, 1);
  });

  it('resumes a rejected-then-accepted session via set_config, not re-init', async () => {
    const { controller, sdk } = makeController();
    controller.setConsent('accepted');
    await flush();
    controller.setConsent('rejected');
    assert.equal(sdk.calls.some((c) => c[0] === 'opt_out'), true);
    controller.setConsent('accepted');
    await flush();
    assert.equal(sdk.calls.filter((c) => c[0] === 'init').length, 1);
    const setConfigs = sdk.calls.filter((c) => c[0] === 'set_config');
    assert.equal(setConfigs.length, 1);
    const beforeSend = (setConfigs[0][1] as Record<string, unknown>).before_send as (event: unknown) => unknown;
    const fakeEvent = {
      event: 'add_to_cart',
      properties: { distinct_id: 'distinct-abc123', product_id: 'product-1', $current_url: 'http://localhost/' },
    };
    assert.notEqual(beforeSend(fakeEvent), null);
    assert.equal(controller.getStatus().ready, true);
    controller.track('add_to_cart', { product_id: 'product-1', quantity: 1 });
    assert.equal(captures(sdk).length, 1);
    assert.notEqual(controller.getContext(), undefined);
  });

  it('lets the newest consent generation initialize once while a stale import resolves', async () => {
    const { controller, sdk, deferredSdk } = makeController({ deferred: true });
    controller.setConsent('accepted');
    // Stale import still in flight; the new consent session starts its own.
    controller.setConsent('rejected');
    controller.setConsent('accepted');
    deferredSdk!.resolve(sdk);
    await flush();
    assert.equal(sdk.calls.filter((c) => c[0] === 'init').length, 1);
    assert.equal(controller.getStatus().ready, true);
    controller.track('cart_viewed', { surface: 'storefront' });
    assert.equal(captures(sdk).length, 1);
  });

  it('stops context and events when the accepted record outlives its TTL inside a long-lived tab', async () => {
    const now = 1_800_000_000_000;
    const { controller, sdk, clock } = makeController({ now });
    controller.setConsent('accepted');
    await flush();
    assert.equal(controller.getStatus().ready, true);
    controller.track('cart_viewed', { surface: 'storefront' });
    assert.equal(captures(sdk).length, 1);
    clock.value = now + 181 * 24 * 60 * 60 * 1000;
    controller.track('cart_viewed', { surface: 'storefront' });
    assert.equal(captures(sdk).length, 1);
    assert.equal(controller.getContext(), undefined);
    assert.equal(controller.getConsent(), 'pending');
    assert.equal(controller.getStatus().consent, 'pending');
    // getStatus must be a pure snapshot: expiry is enforced on capture paths.
    const { controller: pure } = makeController({ now });
    const statusSpy = mock.fn();
    pure.subscribe(statusSpy);
    const before = statusSpy.mock.callCount();
    pure.getStatus();
    assert.equal(statusSpy.mock.callCount(), before, 'getStatus must not notify');
    assert.equal(sdk.calls.some((c) => c[0] === 'opt_out'), true);
  });

  it('applies a pending identity reset before queued flushes after sign-out', async () => {
    const { controller, sdk, deferredSdk } = makeController({ deferred: true });
    controller.setConsent('accepted');
    controller.identify('user_2abcdef123');
    controller.resetIdentity();
    controller.track('add_to_cart', { product_id: 'product-1', quantity: 1 });
    deferredSdk!.resolve(sdk);
    await flush();
    const kinds = sdk.calls.map((c) => c[0]);
    const resetAt = kinds.indexOf('reset');
    const captureAt = kinds.indexOf('capture');
    assert.notEqual(resetAt, -1);
    assert.equal(kinds.indexOf('identify'), -1);
    assert.ok(resetAt < captureAt, 'reset must precede flushed events');
  });

  it('guards each flushed capture against mid-flush signal changes', async () => {
    const harness = makeController({ deferred: true });
    const { controller, sdk, deferredSdk, state } = harness;
    controller.setConsent('accepted');
    controller.track('add_to_cart', { product_id: 'product-1', quantity: 1 });
    controller.track('cart_viewed', { surface: 'storefront' });
    // First flush toggles the privacy signal; the second queued event must stop.
    sdk.capture = (() => {
      let first = true;
      return (event: string, properties?: unknown) => {
        sdk.calls.push(['capture', event, properties]);
        if (first) {
          first = false;
          state.signal = true;
        }
      };
    })();
    deferredSdk!.resolve(sdk);
    await flush();
    assert.equal(captures(sdk).length, 1);
  });

  it('restores a valid stored acceptance and persists version-1 records', async () => {
    const seed = makeStorage();
    seed.map.set(
      ANALYTICS_CONSENT_KEY,
      JSON.stringify({ version: 1, choice: 'accepted', updatedAt: Date.now() }),
    );
    const sdk = makeSdk();
    const controller = createAnalyticsController({
      isExplicitlyEnabled: () => true,
      readConfiguration: () => CONFIG,
      loadSdk: () => Promise.resolve(sdk),
      isDev: () => false,
      privacySignal: () => false,
      getStorage: () => seed,
    });
    assert.equal(controller.getConsent(), 'accepted');
    await controller.initialize();
    await flush();
    assert.ok(sdk.calls.some((c) => c[0] === 'init'));

    const { controller: writer, storage } = makeController();
    writer.setConsent('rejected');
    const record = JSON.parse(storage.map.get(ANALYTICS_CONSENT_KEY)!);
    assert.equal(record.version, 1);
    assert.equal(record.choice, 'rejected');
    assert.equal(typeof record.updatedAt, 'number');
  });

  it('exposes a valid context only after acceptance and readiness', async () => {
    const { controller } = makeController();
    assert.equal(controller.getContext(), undefined);
    controller.setConsent('accepted');
    assert.equal(controller.getContext(), undefined);
    await flush();
    const context = controller.getContext();
    assert.deepEqual(context, {
      consent: true,
      distinctId: 'distinct-abc123',
      sessionId: 'session-xyz789',
      environment: 'test',
    });
  });
});

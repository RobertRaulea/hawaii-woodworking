import {
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_CONSENT_MAX_AGE_MS,
  ANALYTICS_CONSENT_VERSION,
  analyticsCampaign,
  analyticsPath,
  isAnalyticsIdentifier,
  sanitizeAnalyticsProperties,
  validAnalyticsContext,
} from '../../shared/analytics';
import type {
  AnalyticsConfiguration,
  AnalyticsConsent,
  AnalyticsContext,
  AnalyticsProperties,
  ClientAnalyticsEvent,
} from '../../shared/analytics';
import { analyticsOptions } from './analyticsPolicy.utils';
import { createAnalyticsIdentityStore } from './analyticsIdentity.utils';

export interface AnalyticsSdk {
  init: (token: string, config?: Record<string, unknown>) => unknown;
  capture: (event: string, properties?: Record<string, unknown> | null, options?: unknown) => unknown;
  identify: (distinctId: string) => void;
  reset: (options?: unknown) => void;
  opt_in_capturing: (options?: unknown) => void;
  opt_out_capturing: () => void;
  set_config?: (config: Record<string, unknown>) => void;
  get_distinct_id: () => string;
  get_session_id: () => string;
}

export interface AnalyticsStatus {
  consent: AnalyticsConsent;
  enabled: boolean;
  ready: boolean;
  privacyBlocked: boolean;
  epoch: number;
}

export interface AnalyticsControllerDeps {
  isExplicitlyEnabled: () => boolean;
  readConfiguration: () => AnalyticsConfiguration | null;
  loadSdk: () => Promise<AnalyticsSdk | { default: AnalyticsSdk } | { posthog: AnalyticsSdk }>;
  isDev: () => boolean;
  privacySignal: () => boolean;
  getStorage: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  subscribeStorage?: (listener: () => void) => () => void;
  now?: () => number;
}

interface ConsentRecord {
  version: number;
  choice: 'accepted' | 'rejected';
  updatedAt: number;
}

const MAX_PENDING_EVENTS = 100;

export const createAnalyticsController = (deps: AnalyticsControllerDeps) => {
  const now = deps.now ?? (() => Date.now());

  let memoryConsent: ConsentRecord | null = null;
  let consent: AnalyticsConsent = 'pending';
  let consentUpdatedAt: number | null = null;
  // The imported SDK singleton persists across consent sessions; the active
  // handle `sdk` is only set while a consent session is live.
  let module: AnalyticsSdk | null = null;
  let moduleInitialized = false;
  let sdk: AnalyticsSdk | null = null;
  let ready = false;
  // The generation owning an in-flight initialize(); a stale generation's
  // loading state never blocks a newer consent session.
  let loadingGeneration: number | null = null;
  let configuration: AnalyticsConfiguration | null = null;
  let configError: Error | null = null;
  let configReported = false;
  // Bumped on every consent transition so stale async work self-cancels.
  let generation = 0;
  // Bumped each time the SDK becomes ready after an acceptance; observers use
  // it to re-evaluate once-per-consent events.
  let epoch = 0;
  let lastCapturedPath: string | null = null;
  const pendingEvents: Array<{ event: string; properties: Record<string, unknown> }> = [];
  let pendingIdentify: string | null = null;
  let identityResetPending = false;
  const listeners = new Set<() => void>();
  let cachedStatus: AnalyticsStatus = {
    consent: 'pending', enabled: false, ready: false, privacyBlocked: false, epoch: 0,
  };

  const storage = () => {
    try {
      return deps.getStorage();
    } catch {
      return null;
    }
  };
  const identityStore = createAnalyticsIdentityStore(storage, now);

  const readStoredConsent = (): { choice: 'accepted' | 'rejected'; updatedAt: number } | null => {
    const store = storage();
    if (!store) {
      const record = memoryConsent;
      if (
        record &&
        record.updatedAt <= now() &&
        now() - record.updatedAt <= ANALYTICS_CONSENT_MAX_AGE_MS
      ) {
        return record;
      }
      return null;
    }
    try {
      const raw = store.getItem(ANALYTICS_CONSENT_KEY);
      if (!raw) return null;
      const record = JSON.parse(raw) as Partial<ConsentRecord> | null;
      const valid = record !== null && typeof record === 'object' &&
        record.version === ANALYTICS_CONSENT_VERSION &&
        (record.choice === 'accepted' || record.choice === 'rejected') &&
        typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt) &&
        record.updatedAt <= now() &&
        now() - record.updatedAt <= ANALYTICS_CONSENT_MAX_AGE_MS;
      if (!valid) {
        try {
          store.removeItem(ANALYTICS_CONSENT_KEY);
        } catch {
          // storage unavailable: record stays, consent stays pending
        }
        return null;
      }
      return {
        choice: record.choice as 'accepted' | 'rejected',
        updatedAt: record.updatedAt as number,
      };
    } catch {
      return null;
    }
  };

  const persistConsent = (choice: 'accepted' | 'rejected'): void => {
    const record: ConsentRecord = {
      version: ANALYTICS_CONSENT_VERSION,
      choice,
      updatedAt: consentUpdatedAt ?? now(),
    };
    const store = storage();
    if (!store) {
      memoryConsent = record;
      return;
    }
    try {
      store.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify(record));
    } catch {
      memoryConsent = record;
    }
  };

  const privacyBlocked = (): boolean => {
    try {
      return deps.privacySignal();
    } catch {
      return false;
    }
  };

  const resolveConfig = (): AnalyticsConfiguration | null => {
    if (configuration || configError) return configuration;
    if (!deps.isExplicitlyEnabled()) return null;
    try {
      configuration = deps.readConfiguration();
    } catch (error) {
      configError = error instanceof Error ? error : new Error(String(error));
      if (deps.isDev() && !configReported) {
        configReported = true;
        console.error(configError);
      }
      configuration = null;
    }
    return configuration;
  };

  const isConsentFresh = (): boolean =>
    consentUpdatedAt !== null &&
    consentUpdatedAt <= now() &&
    now() - consentUpdatedAt <= ANALYTICS_CONSENT_MAX_AGE_MS;

  const notify = (): void => {
    cachedStatus = {
      consent,
      enabled: deps.isExplicitlyEnabled(),
      ready,
      privacyBlocked: privacyBlocked(),
      epoch,
    };
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // listener errors must not break analytics or the shop
      }
    }
  };

  const dropPending = (): void => {
    pendingEvents.length = 0;
    pendingIdentify = null;
  };

  const teardownSdk = (): void => {
    const current = sdk;
    sdk = null;
    ready = false;
    lastCapturedPath = null;
    identityResetPending = false;
    identityStore.clear();
    if (current) {
      try {
        current.opt_out_capturing();
      } catch {
        // SDK teardown best effort
      }
      try {
        current.reset();
      } catch {
        // SDK teardown best effort
      }
    }
  };

  // A stored acceptance past its TTL silently stops capturing: drop back to
  // pending and tear down so no event, context or status pretends otherwise.
  const expireConsentIfNeeded = (): void => {
    if (consent !== 'accepted' || isConsentFresh()) return;
    generation += 1;
    consent = 'pending';
    consentUpdatedAt = null;
    dropPending();
    teardownSdk();
    notify();
  };

  const captureAllowed = (): boolean => {
    expireConsentIfNeeded();
    return consent === 'accepted' && !privacyBlocked() && resolveConfig() !== null;
  };

  const flushPending = (): void => {
    while (pendingEvents.length > 0) {
      // Consent, expiry or privacy signals may have changed between captures.
      if (!captureAllowed() || !ready || !sdk) return;
      const item = pendingEvents.shift();
      if (!item) break;
      try {
        sdk.capture(item.event, item.properties);
        if (captureAllowed() && sdk && configuration) identityStore.remember(sdk, configuration);
      } catch {
        // transport-level failures are dropped; analytics must never break the shop
      }
    }
    if (pendingIdentify) {
      if (!captureAllowed() || !ready || !sdk) return;
      const id = pendingIdentify;
      pendingIdentify = null;
      try {
        identityStore.clear();
        sdk.identify(id);
      } catch {
        // identification failure is non-fatal
      }
    }
  };

  const initialize = async (): Promise<void> => {
    resolveConfig();
    if (
      consent !== 'accepted' ||
      !isConsentFresh() ||
      privacyBlocked() ||
      !configuration ||
      ready ||
      loadingGeneration === generation
    ) {
      return;
    }
    const gen = generation;
    loadingGeneration = gen;
    try {
      if (!module) {
        const loadedModule = await deps.loadSdk();
        // Revocation or a newer consent transition during the deferred import
        // cancels initialization entirely — no init, no requests.
        if (gen !== generation || consent !== 'accepted' || privacyBlocked() || !configuration) {
          return;
        }
        module =
          (loadedModule as { default?: AnalyticsSdk }).default ??
          (loadedModule as { posthog?: AnalyticsSdk }).posthog ??
          (loadedModule as AnalyticsSdk);
      }
      if (
        gen !== generation ||
        consent !== 'accepted' ||
        !isConsentFresh() ||
        privacyBlocked() ||
        !configuration
      ) {
        return;
      }
      const currentModule = module;
      const markReady = () => {
        if (ready || gen !== generation || consent !== 'accepted') return;
        sdk = currentModule;
        if (identityResetPending) {
          // A sign-out or account switch preceded readiness: clear the previous
          // identity before any queued event or identify is flushed.
          identityResetPending = false;
          try {
            currentModule.reset();
          } catch {
            // reset failure is non-fatal
          }
        }
        try {
          currentModule.opt_in_capturing();
        } catch {
          // opt-in persistence failures are non-fatal
        }
        ready = true;
        epoch += 1;
        if (captureAllowed() && configuration) identityStore.remember(currentModule, configuration);
        flushPending();
        notify();
      };
      const freshOptions = {
        ...analyticsOptions(configuration, () => gen === generation && captureAllowed()),
        bootstrap: identityStore.bootstrap(configuration),
      };
      if (!moduleInitialized) {
        currentModule.init(configuration.projectToken, {
          ...freshOptions,
          loaded: markReady,
        });
        moduleInitialized = true;
        // init is synchronous for the bundled slim build; cover loaders whose
        // init does not invoke the loaded callback.
        if (gen === generation && consent === 'accepted') markReady();
      } else {
        // Resumed session on the same SDK singleton: refresh the options so the
        // before_send guard binds the current generation instead of the stale one.
        try {
          currentModule.set_config?.(freshOptions);
        } catch {
          // older SDKs without set_config still gate through captureAllowed()
        }
        markReady();
      }
    } catch {
      // SDK import/init failure: analytics stays off, the shop keeps working
    } finally {
      if (loadingGeneration === gen) loadingGeneration = null;
      notify();
    }
  };

  const setConsent = (choice: 'accepted' | 'rejected'): void => {
    if (choice === consent) {
      // Idempotent re-accept/re-reject (e.g. reopened settings): refresh the
      // stored record but never reset generation or a live SDK session.
      consentUpdatedAt = now();
      persistConsent(choice);
      return;
    }
    generation += 1;
    consent = choice;
    consentUpdatedAt = now();
    persistConsent(choice);
    dropPending();
    if (choice === 'rejected') {
      teardownSdk();
    }
    notify();
    if (choice === 'accepted') {
      void initialize();
    }
  };

  const syncFromStorage = (): void => {
    const stored = readStoredConsent();
    const storedChoice = stored?.choice ?? 'pending';
    if (storedChoice === consent && (stored === null || stored.updatedAt === consentUpdatedAt)) {
      return;
    }
    if (storedChoice === consent) {
      // Same choice, newer timestamp: adopt it without resetting the session.
      consentUpdatedAt = stored!.updatedAt;
      notify();
      return;
    }
    generation += 1;
    consent = storedChoice;
    consentUpdatedAt = stored?.updatedAt ?? null;
    dropPending();
    if (storedChoice !== 'accepted') teardownSdk();
    notify();
    if (storedChoice === 'accepted') void initialize();
  };

  const captureNow = (event: string, properties: Record<string, unknown>): void => {
    if (ready && sdk) {
      try {
        sdk.capture(event, properties);
        if (captureAllowed() && sdk && configuration) identityStore.remember(sdk, configuration);
      } catch {
        // never let capture break the shop
      }
      return;
    }
    pendingEvents.push({ event, properties });
    if (pendingEvents.length > MAX_PENDING_EVENTS) pendingEvents.shift();
  };

  const track = (event: ClientAnalyticsEvent, properties: AnalyticsProperties = {}): void => {
    if (!captureAllowed()) return;
    captureNow(event, sanitizeAnalyticsProperties(properties));
  };

  const trackPage = (pathname: string, search: string): void => {
    if (!captureAllowed()) return;
    // One pageview per pathname transition: StrictMode remounts and query/hash
    // changes do not re-count.
    if (pathname === lastCapturedPath) return;
    lastCapturedPath = pathname;
    const masked = analyticsPath(pathname);
    const surface =
      masked === '/pos' || masked.startsWith('/admin')
        ? 'admin'
        : masked === '/shipping'
          ? 'shipping'
          : masked === '/checkout'
            ? 'checkout'
            : 'storefront';
    captureNow('$pageview', {
      ...analyticsCampaign(search),
      route_path: masked,
      surface,
    });
  };

  const identify = (userId: string): void => {
    if (!captureAllowed() || !isAnalyticsIdentifier(userId)) return;
    if (!ready || !sdk) {
      pendingIdentify = userId;
      return;
    }
    try {
      // A UUID merged into a person must not bootstrap a future signed-out visit.
      identityStore.clear();
      sdk.identify(userId);
    } catch {
      // identification failure is non-fatal
    }
  };

  const resetIdentity = (): void => {
    pendingIdentify = null;
    identityResetPending = true;
    if (ready && sdk) {
      try {
        sdk.reset();
        if (captureAllowed() && configuration) {
          sdk.opt_in_capturing();
          identityStore.remember(sdk, configuration);
        }
      } catch {
        // reset failure is non-fatal
      }
      identityResetPending = false;
    }
  };

  const getContext = (): AnalyticsContext | undefined => {
    if (!captureAllowed() || !ready || !sdk || !configuration) return undefined;
    try {
      const candidate: AnalyticsContext = {
        consent: true,
        distinctId: sdk.get_distinct_id(),
        sessionId: sdk.get_session_id(),
        environment: configuration.environment,
      };
      identityStore.remember(sdk, configuration);
      return validAnalyticsContext(candidate, configuration.environment) ? candidate : undefined;
    } catch {
      return undefined;
    }
  };

  const getConsent = (): AnalyticsConsent => {
    expireConsentIfNeeded();
    return consent;
  };

  const getStatus = (): AnalyticsStatus => cachedStatus;

  const stored = readStoredConsent();
  if (stored) {
    consent = stored.choice;
    consentUpdatedAt = stored.updatedAt;
  }
  if (consent !== 'accepted') identityStore.clear();
  const unsubscribeStorage = deps.subscribeStorage?.(syncFromStorage);
  notify();

  return {
    initialize,
    track,
    trackPage,
    identify,
    resetIdentity,
    getContext,
    getConsent,
    setConsent,
    getStatus,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy: (): void => {
      unsubscribeStorage?.();
      listeners.clear();
    },
  };
};

export type AnalyticsController = ReturnType<typeof createAnalyticsController>;

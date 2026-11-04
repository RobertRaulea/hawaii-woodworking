import {
  ANALYTICS_CONSENT_KEY,
  readAnalyticsConfiguration,
} from '../../shared/analytics';
import type {
  AnalyticsConsent,
  AnalyticsContext,
  AnalyticsProperties,
  ClientAnalyticsEvent,
} from '../../shared/analytics';
import { createAnalyticsController } from './analyticsController.utils';
import type { AnalyticsSdk, AnalyticsStatus } from './analyticsController.utils';

const detectPrivacySignal = (): boolean => {
  try {
    const nav = typeof navigator !== 'undefined'
      ? (navigator as Navigator & { doNotTrack?: string; globalPrivacyControl?: boolean })
      : undefined;
    const win = typeof window !== 'undefined'
      ? (window as Window & { doNotTrack?: string })
      : undefined;
    const dnt = nav?.doNotTrack ?? win?.doNotTrack;
    return dnt === '1' || dnt === 'yes' || nav?.globalPrivacyControl === true;
  } catch {
    return false;
  }
};

const getLocalStorage = (): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null => {
  try {
    const store = window.localStorage;
    store.getItem('__analytics_probe__');
    return store;
  } catch {
    return null;
  }
};

const controller = createAnalyticsController({
  isExplicitlyEnabled: () => import.meta.env?.VITE_PUBLIC_POSTHOG_ENABLED === 'true',
  readConfiguration: () => readAnalyticsConfiguration(import.meta.env, true),
  // The bundled slim SDK is only ever imported after explicit consent and a
  // valid configuration; nothing PostHog-related loads before that.
  loadSdk: async () => {
    const mod = await import('posthog-js/dist/module.slim.no-external.js');
    return ((mod.default ?? (mod as { posthog?: unknown }).posthog) ?? mod) as AnalyticsSdk;
  },
  isDev: () => import.meta.env?.DEV === true,
  privacySignal: detectPrivacySignal,
  getStorage: getLocalStorage,
  subscribeStorage: (listener) => {
    const handler = (event: StorageEvent) => {
      if (!event.key || event.key === ANALYTICS_CONSENT_KEY) listener();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  },
});

export const initializeAnalytics = (): Promise<void> => controller.initialize();

export const trackAnalytics = (
  event: ClientAnalyticsEvent,
  properties?: AnalyticsProperties,
): void => controller.track(event, properties);

export const trackAnalyticsPage = (pathname: string, search: string): void =>
  controller.trackPage(pathname, search);

export const identifyAnalytics = (userId: string): void => controller.identify(userId);

export const resetAnalyticsIdentity = (): void => controller.resetIdentity();

export const getAnalyticsContext = (): AnalyticsContext | undefined => controller.getContext();

export const getAnalyticsConsent = (): AnalyticsConsent => controller.getConsent();

export const setAnalyticsConsent = (consent: 'accepted' | 'rejected'): void =>
  controller.setConsent(consent);

export const subscribeAnalytics = (listener: () => void): (() => void) =>
  controller.subscribe(listener);

export const getAnalyticsStatus = (): AnalyticsStatus => controller.getStatus();

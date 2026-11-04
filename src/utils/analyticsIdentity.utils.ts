import type { AnalyticsConfiguration } from '../../shared/analytics';
import { ANALYTICS_CONSENT_MAX_AGE_MS } from '../../shared/analytics';

export const ANALYTICS_IDENTITY_KEY = 'hawaii.analytics-identity.v1';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SESSION_UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_MAX_MS = 24 * 60 * 60 * 1000;
type IdentityRecord = {
  version: 1;
  environment: AnalyticsConfiguration['environment'];
  anonymousId: string;
  sessionId: string;
  lastSeenAt: number;
};
type IdentitySdk = { get_distinct_id: () => string; get_session_id: () => string };

// The vendor's general persistence stores raw URLs. Persist only this fixed,
// pseudonymous allowlist and bootstrap its in-memory SDK on subsequent loads.
export const createAnalyticsIdentityStore = (
  getStorage: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
  now: () => number,
) => {
  let memory: IdentityRecord | null = null;
  const read = (configuration: AnalyticsConfiguration): IdentityRecord | null => {
    let value: Partial<IdentityRecord> | null = memory;
    try {
      const raw = getStorage()?.getItem(ANALYTICS_IDENTITY_KEY);
      if (raw) value = JSON.parse(raw) as Partial<IdentityRecord>;
    } catch {
      // The same validation applies to the memory fallback.
    }
    if (!value || value.version !== 1 || value.environment !== configuration.environment ||
      typeof value.anonymousId !== 'string' || !UUID.test(value.anonymousId) ||
      typeof value.sessionId !== 'string' || !SESSION_UUID.test(value.sessionId) ||
      typeof value.lastSeenAt !== 'number' || !Number.isSafeInteger(value.lastSeenAt) ||
      value.lastSeenAt < 0 || value.lastSeenAt > now() ||
      now() - value.lastSeenAt > ANALYTICS_CONSENT_MAX_AGE_MS) return null;
    return {
      version: 1, environment: configuration.environment,
      anonymousId: value.anonymousId, sessionId: value.sessionId, lastSeenAt: value.lastSeenAt,
    };
  };
  return {
    bootstrap: (configuration: AnalyticsConfiguration) => {
      const saved = read(configuration);
      if (!saved) return {};
      const startedAt = parseInt(saved.sessionId.replace(/-/g, '').slice(0, 12), 16);
      return {
        distinctID: saved.anonymousId,
        isIdentifiedID: false,
        ...(now() - saved.lastSeenAt < SESSION_IDLE_MS && startedAt <= now() &&
          now() - startedAt < SESSION_MAX_MS ? { sessionID: saved.sessionId } : {}),
      };
    },
    remember: (sdk: IdentitySdk, configuration: AnalyticsConfiguration): void => {
      try {
        const distinctId = sdk.get_distinct_id();
        const anonymousId = UUID.test(distinctId) ? distinctId : read(configuration)?.anonymousId;
        const sessionId = sdk.get_session_id();
        if (!anonymousId || !SESSION_UUID.test(sessionId)) return;
        memory = { version: 1, environment: configuration.environment, anonymousId, sessionId, lastSeenAt: now() };
        getStorage()?.setItem(ANALYTICS_IDENTITY_KEY, JSON.stringify(memory));
      } catch {
        // Memory-only fallback when browser storage is unavailable.
      }
    },
    clear: (): void => {
      memory = null;
      try {
        getStorage()?.removeItem(ANALYTICS_IDENTITY_KEY);
      } catch {
        // Refusal remains effective even if browser storage cannot be cleared.
      }
    },
  };
};

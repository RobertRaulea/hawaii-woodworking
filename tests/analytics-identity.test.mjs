import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ANALYTICS_IDENTITY_KEY, createAnalyticsIdentityStore } from '../src/utils/analyticsIdentity.utils.ts';
import { createAnalyticsController } from '../src/utils/analyticsController.utils.ts';
import { ANALYTICS_CONSENT_KEY } from '../shared/analytics.ts';

const configuration = { environment: 'test' };
const ANONYMOUS = '11111111-1111-4111-8111-111111111111';
const OTHER_ANONYMOUS = '22222222-2222-4222-8222-222222222222';
const START = 1_800_000_000_000;
const sessionId = (time = START) => {
  const prefix = time.toString(16).padStart(12, '0');
  return `${prefix.slice(0, 8)}-${prefix.slice(8)}-7000-8000-000000000001`;
};
const fixture = () => {
  const map = new Map();
  let time = START;
  const storage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
  const sdk = { get_distinct_id: () => ANONYMOUS, get_session_id: () => sessionId() };
  const store = createAnalyticsIdentityStore(() => storage, () => time);
  return { map, storage, sdk, store, setTime: (value) => { time = value; } };
};

test('the identity store is inert until called and writes only the fixed anonymous allowlist', () => {
  const f = fixture();
  assert.equal(f.map.size, 0);
  assert.deepEqual(f.store.bootstrap(configuration), {});
  assert.equal(f.map.size, 0);
  f.store.remember(f.sdk, configuration);
  assert.deepEqual(JSON.parse(f.map.get(ANALYTICS_IDENTITY_KEY)), {
    version: 1, environment: 'test', anonymousId: ANONYMOUS, sessionId: sessionId(), lastSeenAt: START,
  });
  const reloaded = createAnalyticsIdentityStore(() => f.storage, () => START + 1000);
  assert.deepEqual(reloaded.bootstrap(configuration), {
    distinctID: ANONYMOUS, isIdentifiedID: false, sessionID: sessionId(),
  });
});

test('idle and 24-hour expiry rotate sessions without inventing new visitors', () => {
  const f = fixture();
  f.store.remember(f.sdk, configuration);
  f.setTime(START + 30 * 60 * 1000);
  assert.deepEqual(f.store.bootstrap(configuration), { distinctID: ANONYMOUS, isIdentifiedID: false });
  f.setTime(START + 24 * 60 * 60 * 1000);
  f.store.remember(f.sdk, configuration);
  assert.deepEqual(f.store.bootstrap(configuration), { distinctID: ANONYMOUS, isIdentifiedID: false });
});

test('raw properties and Clerk subjects never become a bootstrap identity', () => {
  const f = fixture();
  const raw = { version: 1, environment: 'test', anonymousId: ANONYMOUS, sessionId: sessionId(), lastSeenAt: START,
    url: 'https://private.invalid/?session=secret', email: 'private@example.invalid' };
  f.map.set(ANALYTICS_IDENTITY_KEY, JSON.stringify(raw));
  assert.deepEqual(f.store.bootstrap(configuration), {
    distinctID: ANONYMOUS, isIdentifiedID: false, sessionID: sessionId(),
  });
  f.store.remember(f.sdk, configuration);
  assert.doesNotMatch(f.map.get(ANALYTICS_IDENTITY_KEY), /private|secret|email|url/);
  f.store.clear();
  f.store.remember({ ...f.sdk, get_distinct_id: () => 'user_clerk_subject' }, configuration);
  assert.equal(f.map.size, 0);
  assert.deepEqual(f.store.bootstrap(configuration), {});
});

test('withdrawal clears only the owned identity key and a reset replaces rather than aliases the browser', () => {
  const f = fixture();
  f.map.set('cart', 'untouched');
  f.store.remember(f.sdk, configuration);
  f.store.remember({ ...f.sdk, get_distinct_id: () => OTHER_ANONYMOUS }, configuration);
  assert.equal(f.store.bootstrap(configuration).distinctID, OTHER_ANONYMOUS);
  f.store.clear();
  assert.equal(f.map.get('cart'), 'untouched');
  assert.deepEqual(f.store.bootstrap(configuration), {});
});

test('malformed, cross-environment, future, expired and non-UUID records never bootstrap', () => {
  for (const patch of [
    { version: 2 }, { environment: 'production' }, { anonymousId: 'private@example.invalid' },
    { sessionId: 'not-a-uuid' }, { lastSeenAt: START + 1 }, { lastSeenAt: -1 },
    { lastSeenAt: START - 181 * 24 * 60 * 60 * 1000 },
  ]) {
    const f = fixture();
    f.map.set(ANALYTICS_IDENTITY_KEY, JSON.stringify({
      version: 1, environment: 'test', anonymousId: ANONYMOUS, sessionId: sessionId(), lastSeenAt: START, ...patch,
    }));
    assert.deepEqual(f.store.bootstrap(configuration), {});
  }
});

test('storage denial retains validated memory-only identity and still honors consent-age expiry', () => {
  let time = START;
  const store = createAnalyticsIdentityStore(() => { throw new Error('unavailable'); }, () => time);
  store.remember({ get_distinct_id: () => ANONYMOUS, get_session_id: () => sessionId() }, configuration);
  assert.equal(store.bootstrap(configuration).distinctID, ANONYMOUS);
  time += 181 * 24 * 60 * 60 * 1000;
  assert.deepEqual(store.bootstrap(configuration), {});
  store.clear();
});

test('a new controller discards identity cached before missing, rejected or expired consent', () => {
  for (const record of [
    undefined,
    { version: 1, choice: 'rejected', updatedAt: START },
    { version: 1, choice: 'accepted', updatedAt: START - 181 * 24 * 60 * 60 * 1000 },
  ]) {
    const f = fixture();
    f.store.remember(f.sdk, configuration);
    if (record) f.storage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify(record));
    createAnalyticsController({
      isExplicitlyEnabled: () => true, readConfiguration: () => null,
      loadSdk: async () => { throw new Error('must not load'); },
      isDev: () => false, privacySignal: () => false,
      getStorage: () => f.storage, now: () => START,
    });
    assert.equal(f.storage.getItem(ANALYTICS_IDENTITY_KEY), null);
  }
});

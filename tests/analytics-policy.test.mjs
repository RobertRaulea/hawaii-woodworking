import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  analyticsCampaign,
  analyticsPath,
  analyticsReferrer,
  readAnalyticsConfiguration,
  sanitizeAnalyticsProperties,
  validAnalyticsContext,
} from '../shared/analytics.ts';
import { analyticsOptions } from '../src/utils/analyticsPolicy.utils.ts';

const configuration = {
  projectToken: 'phc_fixture_token_not_a_real_project',
  host: 'https://eu.i.posthog.com',
  environment: 'test',
};
const context = {
  consent: true, distinctId: 'browser-fixture-id', sessionId: 'session-fixture-id', environment: 'test',
};
const enabled = {
  VITE_APP_ENV: 'test',
  VITE_PUBLIC_POSTHOG_ENABLED: 'true',
  VITE_PUBLIC_POSTHOG_KEY: configuration.projectToken,
  VITE_PUBLIC_POSTHOG_HOST: configuration.host,
  VITE_PUBLIC_POSTHOG_ENV: 'test',
};

test('analytics is deliberately disabled by default and explicitly binds enabled EU configuration to environment', () => {
  assert.equal(readAnalyticsConfiguration({}, true), null);
  assert.deepEqual(readAnalyticsConfiguration(enabled, true), configuration);
  for (const name of ['VITE_PUBLIC_POSTHOG_KEY', 'VITE_PUBLIC_POSTHOG_HOST', 'VITE_PUBLIC_POSTHOG_ENV']) {
    assert.throws(() => readAnalyticsConfiguration({ ...enabled, [name]: '' }, true),
      new RegExp(`${name} variable required by PostHog is missing or un-configured`));
  }
  for (const host of ['https://us.i.posthog.com', 'http://eu.i.posthog.com', 'https://attacker.invalid']) {
    assert.throws(() => readAnalyticsConfiguration({ ...enabled, VITE_PUBLIC_POSTHOG_HOST: host }, true));
  }
  assert.throws(() => readAnalyticsConfiguration({ ...enabled, VITE_PUBLIC_POSTHOG_ENV: 'production' }, true));
});

test('attribution never accepts an email, missing consent or cross-environment context', () => {
  assert.equal(validAnalyticsContext(context, 'test'), true);
  for (const invalid of [undefined, { ...context, consent: false }, { ...context, distinctId: 'buyer@example.invalid' },
    { ...context, sessionId: '<script>' }, { ...context, environment: 'production' }]) {
    assert.equal(validAnalyticsContext(invalid, 'test'), false);
  }
});

test('all detail, unknown and transactional URLs lose ids, query strings and fragments', () => {
  for (const [input, expected] of [
    ['/thank-you?session_id=cs_secret#password', '/thank-you'],
    ['/product/secret-product-id', '/product/:productId'],
    ['/my-orders/order-secret', '/my-orders/:id'],
    ['/admin/customers/private-id', '/admin/customers/:id'],
    ['/admin/inventory', '/admin/inventory'],
    ['/unknown/buyer@example.invalid', '/not-found'],
    ['/products/', '/products'],
  ]) assert.equal(analyticsPath(input), expected);
  assert.equal(analyticsReferrer('https://example.invalid/customer/private?email=secret#password'), 'https://example.invalid');
  assert.equal(analyticsReferrer('javascript:alert(1)'), '');
});

test('action properties and campaign context use a finite allowlist rather than arbitrary form values', () => {
  assert.deepEqual(sanitizeAnalyticsProperties({
    product_id: 'fixture-product-id', quantity: 3, item_count: 4, surface: 'checkout',
    email: 'private@example.invalid', name: 'Private', phone: '+40712345678',
    address: 'Private street', error_message: 'Sensitive provider response',
    method: 'private@example.invalid', arbitrary: { secret: true },
  }), { product_id: 'fixture-product-id', quantity: 3, item_count: 4, surface: 'checkout' });
  assert.deepEqual(analyticsCampaign('?utm_source=google&utm_medium=cpc&utm_campaign=secret&session_id=secret'), {
    utm_source: 'google', utm_medium: 'cpc',
  });
  assert.deepEqual(analyticsCampaign('?utm_source=buyer%40example.invalid&utm_medium=secret'), {
    utm_source: 'other', utm_medium: 'other',
  });
  assert.deepEqual(sanitizeAnalyticsProperties({ quantity: NaN, item_count: -1, product_id: 'a@b.invalid' }), {});
  assert.deepEqual(sanitizeAnalyticsProperties(JSON.parse('{"constructor":"private","__proto__":"private"}')), {});
});

test('the final SDK send boundary strips automatic sensitive context and applies environment and privacy flags', () => {
  let consent = true;
  const options = analyticsOptions(configuration, () => consent);
  assert.equal(options.persistence, 'memory');
  assert.equal(options.disable_capture_url_hashes, true);
  for (const key of ['capture_pageview', 'capture_pageleave', 'autocapture', 'capture_exceptions', 'capture_performance', 'save_referrer', 'save_campaign_params']) {
    assert.equal(options[key], false, key);
  }
  for (const key of ['disable_session_recording', 'disable_surveys', 'advanced_disable_flags', 'disable_external_dependency_loading', 'respect_dnt']) {
    assert.equal(options[key], true, key);
  }
  const result = options.before_send({
    event: '$pageview',
    properties: {
      token: 'wrong-token', environment: 'production',
      distinct_id: context.distinctId, $session_id: context.sessionId,
      $current_url: 'https://www.hawaiiproducts.ro/thank-you?session_id=cs_secret#private',
      $referrer: 'https://source.invalid/secret?email=private@example.invalid',
      $initial_current_url: 'https://example.invalid/private',
      $set_once: { email: 'private@example.invalid' }, $set: { phone: '+40712345678' },
      $browser: 'Firefox', $device_type: 'Desktop', $screen_height: 900,
      email: 'private@example.invalid',
    },
  });
  assert.ok(result);
  assert.equal(result.properties.$current_url, 'https://www.hawaiiproducts.ro/thank-you');
  assert.equal(result.properties.$pathname, '/thank-you');
  assert.equal(result.properties.$referrer, 'https://source.invalid');
  assert.equal(result.properties.environment, 'test');
  assert.equal(result.properties.token, configuration.projectToken);
  assert.equal(result.properties.$session_id, context.sessionId);
  assert.equal(result.properties.$geoip_disable, true);
  assert.deepEqual(result.properties.$set, {});
  assert.deepEqual(result.properties.$set_once, {});
  assert.equal(result.properties.$browser, 'Firefox');
  assert.doesNotMatch(JSON.stringify(result), /cs_secret|private@example|40712345678|initial_current_url/);
  assert.equal(options.before_send({ event: '$autocapture', properties: {} }), null);
  consent = false;
  assert.equal(options.before_send({ event: '$pageview', properties: {} }), null);
});

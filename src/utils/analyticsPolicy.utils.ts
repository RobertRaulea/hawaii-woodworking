import type { PostHogConfig } from 'posthog-js';

import {
  analyticsPath,
  analyticsReferrer,
  CLIENT_ANALYTICS_EVENTS,
  isAnalyticsIdentifier,
  sanitizeAnalyticsProperties,
} from '../../shared/analytics';
import type { AnalyticsConfiguration } from '../../shared/analytics';

const SDK_IDS = new Set([
  'distinct_id', '$device_id', '$session_id', '$window_id', '$anon_distinct_id', '$insert_id',
]);
const SDK_DIMENSIONS = new Set([
  '$screen_height', '$screen_width', '$viewport_height', '$viewport_width', '$time',
]);
const SDK_CONTEXT = new Set([
  '$browser', '$browser_version', '$os', '$os_version', '$device', '$device_type', '$lib', '$lib_version',
]);

export const analyticsOptions = (
  configuration: AnalyticsConfiguration,
  canCapture: () => boolean,
): Partial<PostHogConfig> => ({
  api_host: configuration.host,
  ui_host: 'https://eu.posthog.com',
  capture_pageview: false,
  capture_pageleave: false,
  autocapture: false,
  rageclick: false,
  capture_dead_clicks: false,
  capture_exceptions: false,
  capture_performance: false,
  disable_session_recording: true,
  disable_surveys: true,
  disable_external_dependency_loading: true,
  advanced_disable_flags: true,
  enable_recording_console_log: false,
  save_referrer: false,
  save_campaign_params: false,
  person_profiles: 'identified_only',
  persistence: 'memory',
  disable_capture_url_hashes: true,
  respect_dnt: true,
  opt_out_capturing_by_default: true,
  opt_out_persistence_by_default: true,
  before_send: (event) => {
    if (!event || !canCapture() ||
      !['$pageview', '$identify', ...CLIENT_ANALYTICS_EVENTS].includes(event.event)) return null;
    const properties: Record<string, unknown> = sanitizeAnalyticsProperties(event.properties);
    for (const [key, value] of Object.entries(event.properties)) {
      if (SDK_IDS.has(key) && isAnalyticsIdentifier(value)) properties[key] = value;
      if (SDK_DIMENSIONS.has(key) && typeof value === 'number' && Number.isFinite(value)) properties[key] = value;
      if (SDK_CONTEXT.has(key) && (typeof value === 'number' ||
        (typeof value === 'string' && /^[A-Za-z0-9 ._()/-]{1,80}$/.test(value)))) properties[key] = value;
      if (key === '$is_identified' && typeof value === 'boolean') properties[key] = value;
    }
    properties.token = configuration.projectToken;
    properties.environment = configuration.environment;
    properties.$geoip_disable = true;
    properties.$process_person_profile = event.properties.$process_person_profile === true;
    // No automatic first-touch/person properties: those can contain raw query strings.
    properties.$set = {};
    properties.$set_once = {};
    try {
      const location = new URL(String(event.properties.$current_url));
      properties.$current_url = `${location.origin}${analyticsPath(location.pathname)}`;
      properties.$pathname = analyticsPath(location.pathname);
      properties.$host = location.host;
    } catch {
      properties.$pathname = '/not-found';
    }
    const referrer = analyticsReferrer(String(event.properties.$referrer ?? ''));
    properties.$referrer = referrer;
    properties.$referring_domain = referrer ? new URL(referrer).hostname : '';
    return { ...event, properties };
  },
});

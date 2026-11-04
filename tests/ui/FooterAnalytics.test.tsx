import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it, mock } from 'node:test';
import { initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';

const track = mock.fn();
const status = {
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
    identifyAnalytics: () => {},
    resetAnalyticsIdentity: () => {},
    getAnalyticsContext: () => undefined,
    getAnalyticsConsent: () => status.consent,
    setAnalyticsConsent: () => {},
    subscribeAnalytics: () => () => {},
    getAnalyticsStatus: () => status,
  },
});

const { Footer } = await import('../../src/components/Footer/Footer.tsx');

const ro = JSON.parse(
  readFileSync(new URL('../../src/i18n/locales/ro.json', import.meta.url), 'utf8'),
);
await i18n.use(initReactI18next).init({
  resources: { ro: { translation: ro } },
  lng: 'ro',
  fallbackLng: 'ro',
  interpolation: { escapeValue: false },
});

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );

const ctaEvents = () =>
  track.mock.calls.map((c) => c.arguments).filter((a) => a[0] === 'cta_clicked');

beforeEach(() => {
  track.mock.resetCalls();
});

describe('footer contact CTA instrumentation', () => {
  it('emits a fixed-property cta_clicked for the canonical email link without altering it', async () => {
    renderFooter();
    const link = screen.getByRole('link', { name: 'hawaiisibiu@gmail.com' });
    assert.equal(link.getAttribute('href'), 'mailto:hawaiisibiu@gmail.com');
    fireEvent.click(link);
    assert.deepEqual(ctaEvents(), [
      ['cta_clicked', { cta_name: 'contact_email', surface: 'storefront' }],
    ]);
    const props = ctaEvents()[0][1] as Record<string, unknown>;
    assert.equal(JSON.stringify(props).includes('@'), false);
    assert.equal(link.getAttribute('href'), 'mailto:hawaiisibiu@gmail.com');
  });

  it('emits cta_clicked for the phone link on keyboard activation', async () => {
    const user = userEvent.setup();
    renderFooter();
    const link = screen.getByRole('link', { name: '+40 748 831 477' });
    assert.equal(link.getAttribute('href'), 'tel:+40748831477');
    link.focus();
    await user.keyboard('{Enter}');
    assert.deepEqual(ctaEvents(), [
      ['cta_clicked', { cta_name: 'contact_phone', surface: 'storefront' }],
    ]);
    const props = ctaEvents()[0][1] as Record<string, unknown>;
    assert.equal(JSON.stringify(props).includes('748'), false);
  });

  it('emits nothing for social or navigation links', () => {
    renderFooter();
    for (const link of screen.getAllByRole('link')) {
      fireEvent.click(link);
    }
    assert.equal(ctaEvents().length, 2);
  });
});

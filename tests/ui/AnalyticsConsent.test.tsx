import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it, mock } from 'node:test';
import { act } from 'react';
import { initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';

const setConsent = mock.fn<(choice: 'accepted' | 'rejected') => void>();
let status = {
  consent: 'pending' as 'pending' | 'accepted' | 'rejected',
  enabled: true,
  ready: false,
  privacyBlocked: false,
  epoch: 0,
};
const subscribers = new Set<() => void>();
const emitStatus = () => {
  for (const listener of subscribers) listener();
};

mock.module(new URL('../../src/utils/analytics.utils.ts', import.meta.url).href, {
  namedExports: {
    initializeAnalytics: async () => {},
    trackAnalytics: () => {},
    trackAnalyticsPage: () => {},
    identifyAnalytics: () => {},
    resetAnalyticsIdentity: () => {},
    getAnalyticsContext: () => undefined,
    getAnalyticsConsent: () => status.consent,
    setAnalyticsConsent: (choice: 'accepted' | 'rejected') => {
      setConsent(choice);
      status = { ...status, consent: choice };
      emitStatus();
    },
    subscribeAnalytics: (listener: () => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    getAnalyticsStatus: () => status,
  },
});

const { AnalyticsConsent } = await import('../../src/components/Analytics/AnalyticsConsent.tsx');

const resources = Object.fromEntries(
  ['ro', 'en', 'de'].map((language) => [
    language,
    {
      translation: JSON.parse(
        readFileSync(new URL(`../../src/i18n/locales/${language}.json`, import.meta.url), 'utf8'),
      ) as Record<string, unknown>,
    },
  ]),
);
await i18n.use(initReactI18next).init({
  resources,
  lng: 'ro',
  fallbackLng: 'ro',
  interpolation: { escapeValue: false },
});

const renderConsent = () =>
  render(
    <MemoryRouter>
      <AnalyticsConsent />
    </MemoryRouter>,
  );

beforeEach(async () => {
  status = { consent: 'pending', enabled: true, ready: false, privacyBlocked: false, epoch: 0 };
  setConsent.mock.resetCalls();
  await i18n.changeLanguage('ro');
});

describe('analytics consent UI', () => {
  it('renders nothing while analytics is disabled or privacy signals are present', () => {
    status = { ...status, enabled: false };
    const { container } = renderConsent();
    assert.equal(container.innerHTML, '');
    status = { ...status, enabled: true, privacyBlocked: true };
    const second = renderConsent();
    assert.equal(second.container.innerHTML, '');
  });

  it('offers an equal-prominence accept and refuse choice on first visit', async () => {
    const user = userEvent.setup();
    renderConsent();
    const dialog = screen.getByRole('dialog', { name: 'Statistici de utilizare' });
    assert.ok(dialog.getAttribute('aria-describedby'));
    const accept = screen.getByRole('button', { name: 'Accept statistici' });
    const reject = screen.getByRole('button', { name: 'Refuz statistici' });
    // Refusal is as easy and prominent as acceptance: identical presentation.
    assert.equal(accept.className, reject.className);
    assert.equal((accept as HTMLButtonElement).disabled, false);
    assert.equal((reject as HTMLButtonElement).disabled, false);
    // Real keyboard activation, not a synthetic click.
    accept.focus();
    await user.keyboard('{Enter}');
    assert.equal(setConsent.mock.calls[0].arguments[0], 'accepted');
  });

  it('links to the privacy policy without gating shop usage on consent', () => {
    renderConsent();
    const link = screen.getByRole('link', { name: 'Politica de confidențialitate' });
    assert.equal(link.getAttribute('href'), '/privacy-policy');
    // No modal overlay traps the page behind a choice.
    const dialog = screen.getByRole('dialog');
    assert.equal(dialog.getAttribute('aria-modal'), 'false');
  });

  it('hides the panel after a choice and reopens from the compact settings button', async () => {
    renderConsent();
    fireEvent.click(screen.getByRole('button', { name: 'Refuz statistici' }));
    assert.equal(setConsent.mock.calls[0].arguments[0], 'rejected');
    assert.equal(screen.queryByRole('dialog'), null);
    const reopen = screen.getByRole('button', { name: 'Setări statistici' });
    fireEvent.click(reopen);
    const dialog = screen.getByRole('dialog');
    assert.ok(dialog);
    // Focus moved into the reopened panel.
    assert.ok(dialog.contains(document.activeElement));
    fireEvent.keyDown(document.activeElement ?? window, { key: 'Escape' });
    assert.equal(screen.queryByRole('dialog'), null);
    // Focus restored to the settings control.
    assert.equal(
      (document.activeElement as HTMLElement)?.getAttribute('aria-label'),
      'Setări statistici',
    );
  });

  it('restores focus to the opener after choosing from the reopened panel', async () => {
    status = { ...status, consent: 'rejected' };
    renderConsent();
    const reopen = screen.getByRole('button', { name: 'Setări statistici' });
    fireEvent.click(reopen);
    assert.ok(screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: 'Accept statistici' }));
    assert.equal(setConsent.mock.calls[0].arguments[0], 'accepted');
    assert.equal(
      (document.activeElement as HTMLElement)?.getAttribute('aria-label'),
      'Setări statistici',
    );
  });

  it('localizes the banner and settings control in English and German', async () => {
    const { unmount } = renderConsent();
    await act(async () => i18n.changeLanguage('en'));
    assert.ok(screen.getByRole('dialog', { name: 'Usage analytics' }));
    assert.ok(screen.getByRole('button', { name: 'Accept analytics' }));
    assert.ok(screen.getByRole('button', { name: 'Reject analytics' }));
    assert.ok(screen.getByRole('link', { name: 'Privacy policy' }));
    await act(async () => i18n.changeLanguage('de'));
    assert.ok(screen.getByRole('dialog', { name: 'Nutzungsstatistiken' }));
    assert.ok(screen.getByRole('button', { name: 'Statistiken akzeptieren' }));
    assert.ok(screen.getByRole('button', { name: 'Statistiken ablehnen' }));
    assert.ok(screen.getByRole('link', { name: 'Datenschutzerklärung' }));
    fireEvent.click(screen.getByRole('button', { name: 'Statistiken ablehnen' }));
    assert.equal(setConsent.mock.calls[0].arguments[0], 'rejected');
    assert.ok(screen.getByRole('button', { name: 'Statistik-Einstellungen' }));
    unmount();
  });
});

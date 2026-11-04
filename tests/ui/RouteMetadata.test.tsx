import { render } from '@testing-library/react';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import * as helmetEsm from 'react-helmet-async/lib/index.esm.js';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readFileSync } from 'node:fs';

const { HelmetProvider } = helmetEsm;

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

mock.module('react-helmet-async', { namedExports: helmetEsm });

const { RouteSEO } = await import('../../src/components/SEO/RouteSEO.tsx');

const renderSeo = (route: string, environment: 'test' | 'production' = 'production') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        <RouteSEO environment={environment} />
      </MemoryRouter>
    </HelmetProvider>,
  );

const settle = () => new Promise((resolve) => setTimeout(resolve, 60));
const meta = (selector: string) =>
  document.head.querySelector(selector)?.getAttribute('content') ?? null;

const ROUTES: Array<{
  path: string;
  titles: Record<'ro' | 'en' | 'de', string>;
  descriptions: Record<'ro' | 'en' | 'de', string>;
}> = [
  {
    path: '/shipping',
    titles: { ro: 'Informații de livrare', en: 'Shipping details', de: 'Lieferdaten' },
    descriptions: {
      ro: 'Introdu datele de livrare pentru comanda ta din magazinul Hawaii Woodworking.',
      en: 'Enter the delivery details for your Hawaii Woodworking order.',
      de: 'Gib die Lieferdaten für deine Hawaii Woodworking Bestellung ein.',
    },
  },
  {
    path: '/checkout',
    titles: { ro: 'Finalizare comandă', en: 'Checkout', de: 'Kasse' },
    descriptions: {
      ro: 'Verifică produsele și finalizează comanda în magazinul Hawaii Woodworking.',
      en: 'Review your items and complete your Hawaii Woodworking order.',
      de: 'Prüfe deine Produkte und schließe die Hawaii Woodworking Bestellung ab.',
    },
  },
  {
    path: '/thank-you',
    titles: { ro: 'Starea plății', en: 'Payment status', de: 'Zahlungsstatus' },
    descriptions: {
      ro: 'Verifică starea plății pentru comanda ta la Hawaii Woodworking.',
      en: 'Check the payment status of your Hawaii Woodworking order.',
      de: 'Prüfe den Zahlungsstatus deiner Hawaii Woodworking Bestellung.',
    },
  },
  {
    path: '/terms-and-conditions',
    titles: { ro: 'Termeni și condiții', en: 'Terms and conditions', de: 'Allgemeine Geschäftsbedingungen' },
    descriptions: {
      ro: 'Termenii și condițiile de utilizare și vânzare ale magazinului Hawaii Woodworking.',
      en: 'Terms of use and sale for the Hawaii Woodworking store.',
      de: 'Nutzungs- und Verkaufsbedingungen des Hawaii Woodworking Shops.',
    },
  },
  {
    path: '/privacy-policy',
    titles: { ro: 'Politica de confidențialitate', en: 'Privacy policy', de: 'Datenschutzerklärung' },
    descriptions: {
      ro: 'Cum colectează și protejează Hawaii Woodworking datele tale personale.',
      en: 'How Hawaii Woodworking collects and protects your personal data.',
      de: 'Wie Hawaii Woodworking deine personenbezogenen Daten erhebt und schützt.',
    },
  },
  {
    path: '/return-policy',
    titles: { ro: 'Politica de retur', en: 'Return policy', de: 'Rückgaberichtlinie' },
    descriptions: {
      ro: 'Condițiile și procedura de returnare a produselor Hawaii Woodworking.',
      en: 'Conditions and procedure for returning Hawaii Woodworking products.',
      de: 'Bedingungen und Verfahren für die Rückgabe von Hawaii Woodworking Produkten.',
    },
  },
  {
    path: '/legal-information',
    titles: { ro: 'Informații legale', en: 'Legal information', de: 'Rechtliche Informationen' },
    descriptions: {
      ro: 'Datele de identificare și informațiile legale ale operatorului Hawaii Woodworking.',
      en: 'Identification and legal information of the Hawaii Woodworking operator.',
      de: 'Kennzeichnung und rechtliche Angaben des Hawaii Woodworking Betreibers.',
    },
  },
];

for (const route of ROUTES) {
  for (const language of ['ro', 'en', 'de'] as const) {
    it(`${route} emits localized title and description in ${language}`, async () => {
      await i18n.changeLanguage(language);
      const view = renderSeo(route.path);
      await settle();
      assert.ok(
        document.title.includes(route.titles[language]),
        `${route.path} title should include "${route.titles[language]}", got "${document.title}"`,
      );
      assert.equal(meta('meta[name="description"]'), route.descriptions[language]);
      view.unmount();
    });
  }
}

it('transactional routes stay noindex and TEST always forces deny-all robots', async () => {
  for (const path of ['/shipping', '/checkout', '/thank-you']) {
    const view = renderSeo(path);
    await settle();
    assert.match(meta('meta[name="robots"]') ?? '', /noindex, follow/, path);
    view.unmount();
  }
  for (const path of ['/shipping', '/products', '/privacy-policy']) {
    const view = renderSeo(path, 'test');
    await settle();
    assert.equal(meta('meta[name="robots"]'), 'noindex, nofollow, noarchive', path);
    view.unmount();
  }
});

it('a session query never leaks into title or canonical', async () => {
  const view = renderSeo('/thank-you?session_id=cs_test_secret123');
  await settle();
  const canonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
  assert.equal(canonical, 'https://www.hawaiiproducts.ro/thank-you');
  assert.equal(meta('meta[property="og:url"]'), canonical);
  assert.equal(document.title.includes('cs_test_secret123'), false);
  view.unmount();
});

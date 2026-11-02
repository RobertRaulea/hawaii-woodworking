import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import * as helmetEsm from 'react-helmet-async/lib/index.esm.js';
const { HelmetProvider } = helmetEsm;
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readFileSync } from 'node:fs';

const ro = JSON.parse(
  readFileSync(new URL('../../src/i18n/locales/ro.json', import.meta.url), 'utf8'),
);
const en = JSON.parse(
  readFileSync(new URL('../../src/i18n/locales/en.json', import.meta.url), 'utf8'),
);
const de = JSON.parse(
  readFileSync(new URL('../../src/i18n/locales/de.json', import.meta.url), 'utf8'),
);
await i18n.use(initReactI18next).init({
  resources: {
    ro: { translation: ro },
    en: { translation: en },
    de: { translation: de },
  },
  lng: 'ro',
  fallbackLng: 'ro',
  interpolation: { escapeValue: false },
});

mock.module('react-helmet-async', { namedExports: helmetEsm });

import { LanguageProvider } from '../../src/context/LanguageContext';
const { Services } = await import('../../src/pages/Services/Services.tsx');
const { CncMachining } = await import('../../src/pages/Services/CncMachining.tsx');
const { CircularCutting } = await import('../../src/pages/Services/CircularCutting.tsx');
const { SolidWoodPanels } = await import('../../src/pages/Services/SolidWoodPanels.tsx');
const { CustomProducts } = await import('../../src/pages/CustomProducts/CustomProducts.tsx');
import { Footer } from '../../src/components/Footer/Footer';

const renderPage = (element: React.ReactNode) =>
  render(
    <HelmetProvider>
      <LanguageProvider>
        <MemoryRouter>{element}</MemoryRouter>
      </LanguageProvider>
    </HelmetProvider>,
  );

it('services hub has one h1, routes to all five destinations and exposes contact CTAs', () => {
  renderPage(<Services />);
  assert.equal(screen.getAllByRole('heading', { level: 1 }).length, 1);
  for (const href of ['/servicii/prelucrare-cnc-lemn', '/servicii/debitare-circular', '/servicii/panouri-lemn-masiv-lamela-continua', '/produse-personalizate', '/products']) {
    assert.ok(document.querySelector(`a[href="${href}"]`), href);
  }
  const call = screen.getByRole('link', { name: /Sună-ne/ });
  assert.equal(call.getAttribute('href'), 'tel:+40748831477');
  const email = screen.getByRole('link', { name: 'Trimite e-mail' });
  const href = email.getAttribute('href') ?? '';
  assert.ok(href.startsWith('mailto:hawaiisibiu@gmail.com?subject='));
  assert.ok(href.includes(encodeURIComponent('Solicitare ofertă')));
  assert.ok(screen.getByText('Lucrați cu clienți din afara Sibiului?'));
});

it('CNC page explains materials and individual quantity assessment', async () => {
  const user = userEvent.setup();
  renderPage(<CncMachining />);
  assert.equal(screen.getAllByRole('heading', { level: 1 }).length, 1);
  assert.match(document.body.textContent ?? '', /MDF/);
  assert.match(document.body.textContent ?? '', /placaj/i);
  await user.click(screen.getByText('Există o cantitate minimă de comandă?'));
  assert.match(document.body.textContent ?? '', /Cantitatea acceptată, prețul și fezabilitatea se confirmă după evaluarea proiectului/);
  assert.match(document.body.textContent ?? '', /desenul piesei, material, dimensiuni, cantitate și finisaj/);
  const serviceLd = document.head.querySelector('script[type="application/ld+json"]')?.textContent ?? '';
  assert.ok(serviceLd.includes('"Service"'));
  assert.ok(serviceLd.includes('Romania'));
  assert.ok(serviceLd.includes('BreadcrumbList'));
});

it('custom products page links to catalog and store', async () => {
  const user = userEvent.setup();
  renderPage(<CustomProducts />);
  assert.equal(screen.getAllByRole('heading', { level: 1 }).length, 1);
  assert.ok(document.querySelector('a[href="/catalog"]'));
  assert.ok(document.querySelector('a[href="/products"]'));
  await user.click(screen.getByText('Pot personaliza orice produs din magazin?'));
  assert.match(document.body.textContent ?? '', /Nu toate produsele pot fi modificate/);
});

it('footer exposes service links', () => {
  renderPage(<Footer />);
  const footer = document.querySelector('footer');
  assert.ok(footer);
  assert.ok(within(footer as HTMLElement).getByRole('link', { name: 'Servicii' }));
  assert.ok(within(footer as HTMLElement).getByRole('link', { name: 'Produse personalizate' }));
  assert.ok(within(footer as HTMLElement).getByRole('link', { name: 'Debitare la circular' }));
  assert.ok(within(footer as HTMLElement).getByRole('link', { name: 'Panouri lemn masiv' }));
});

import { useLanguage } from '../../src/context/LanguageContext';

it('CNC page renders translated content and consistent canonical per language', async () => {
  let setLanguage: ((language: 'ro' | 'en' | 'de') => void) | null = null;
  const Capture = () => {
    ({ setLanguage } = useLanguage());
    return null;
  };
  render(
    <HelmetProvider>
      <LanguageProvider>
        <MemoryRouter>
          <Capture />
          <CncMachining />
        </MemoryRouter>
      </LanguageProvider>
    </HelmetProvider>,
  );
  const cases: { language: 'ro' | 'en' | 'de'; heading: RegExp; lang: string }[] = [
    { language: 'ro', heading: /Prelucrare CNC a lemnului/, lang: 'ro' },
    { language: 'en', heading: /CNC machining of wood, MDF and plywood/, lang: 'en' },
    { language: 'de', heading: /CNC-Bearbeitung von Holz, MDF und Sperrholz/, lang: 'de' },
  ];
  for (const current of cases) {
    await act(async () => {
      setLanguage?.(current.language);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    assert.match(
      screen.getByRole('heading', { level: 1 }).textContent ?? '',
      current.heading,
    );
    const ld =
      document.head.querySelector('script[type="application/ld+json"]')
        ?.textContent ?? '';
    const service = JSON.parse(ld)['@graph'][0];
    assert.equal(
      service.url,
      'https://www.hawaiiproducts.ro/servicii/prelucrare-cnc-lemn',
    );
  }
});

it('CNC CTA states the email app opens and nothing is sent automatically', () => {
  renderPage(<CncMachining />);
  assert.match(
    document.body.textContent ?? '',
    /nu este trimisă automat/,
  );
  const email = screen.getByRole('link', { name: 'Trimite e-mail' });
  assert.ok((email.getAttribute('href') ?? '').startsWith('mailto:'));
  const call = screen.getByRole('link', { name: /Sună-ne/ });
  assert.equal(call.getAttribute('href'), 'tel:+40748831477');
});

it('circular cutting page renders service content, canonical and encoded contact CTAs', async () => {
  render(
    <HelmetProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/servicii/debitare-circular']}>
          <CircularCutting />
        </MemoryRouter>
      </LanguageProvider>
    </HelmetProvider>,
  );
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(screen.getAllByRole('heading', { level: 1 }).length, 1);
  assert.equal(
    screen.getByRole('heading', { level: 1 }).textContent,
    'Debitare la circular',
  );
  assert.match(document.body.textContent ?? '', /lista de piese/i);
  const email = screen.getByRole('link', { name: 'Trimite e-mail' });
  const href = email.getAttribute('href') ?? '';
  assert.ok(href.startsWith('mailto:hawaiisibiu@gmail.com?subject='));
  assert.ok(href.includes(encodeURIComponent('Debitare la circular')));
  assert.match(document.body.textContent ?? '', /nu este trimisă automat/);
  assert.equal(
    (screen.getByRole('link', { name: /Sună-ne/ })).getAttribute('href'),
    'tel:+40748831477',
  );
  let canonical: string | null = null;
  let ogUrl: string | null = null;
  for (let attempt = 0; attempt < 20 && !canonical; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    canonical = document.head
      .querySelector('link[rel="canonical"]')
      ?.getAttribute('href') ?? null;
    ogUrl = document.head
      .querySelector('meta[property="og:url"]')
      ?.getAttribute('content') ?? null;
  }
  assert.equal(
    canonical,
    'https://www.hawaiiproducts.ro/servicii/debitare-circular',
  );
  assert.equal(ogUrl, canonical);
  const ld =
    document.head.querySelector('script[type="application/ld+json"]')
      ?.textContent ?? '';
  assert.ok(ld.includes('"Service"'));
  assert.ok(ld.includes('BreadcrumbList'));
});

it('solid wood panels page renders enquiry content without fabricated Product/Offer schema', async () => {
  render(
    <HelmetProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/servicii/panouri-lemn-masiv-lamela-continua']}>
          <SolidWoodPanels />
        </MemoryRouter>
      </LanguageProvider>
    </HelmetProvider>,
  );
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(screen.getAllByRole('heading', { level: 1 }).length, 1);
  assert.equal(
    screen.getByRole('heading', { level: 1 }).textContent,
    'Panouri din lemn masiv cu lamelă continuă',
  );
  assert.match(document.body.textContent ?? '', /lamelă continuă/i);
  const email = screen.getByRole('link', { name: 'Trimite e-mail' });
  const href = email.getAttribute('href') ?? '';
  assert.ok(href.includes(encodeURIComponent('Panouri lemn masiv')));
  assert.match(document.body.textContent ?? '', /nu este trimisă automat/);
  let canonical: string | null = null;
  let ogUrl: string | null = null;
  for (let attempt = 0; attempt < 20 && !canonical; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    canonical = document.head
      .querySelector('link[rel="canonical"]')
      ?.getAttribute('href') ?? null;
    ogUrl = document.head
      .querySelector('meta[property="og:url"]')
      ?.getAttribute('content') ?? null;
  }
  assert.equal(
    canonical,
    'https://www.hawaiiproducts.ro/servicii/panouri-lemn-masiv-lamela-continua',
  );
  assert.equal(ogUrl, canonical);
  const ld =
    document.head.querySelector('script[type="application/ld+json"]')
      ?.textContent ?? '';
  assert.ok(ld.includes('BreadcrumbList'));
  assert.ok(!ld.includes('"Product"'));
  assert.ok(!ld.includes('"Offer"'));
});

it('new service pages switch headings across ro/en/de', async () => {
  let setLanguage: ((language: 'ro' | 'en' | 'de') => void) | null = null;
  const Capture = () => {
    ({ setLanguage } = useLanguage());
    return null;
  };
  const cases: { element: React.ReactNode; headings: RegExp[] }[] = [
    {
      element: <CircularCutting />,
      headings: [/Debitare la circular/, /Circular saw cutting/, /Zuschnitt an der Kreissäge/],
    },
    {
      element: <SolidWoodPanels />,
      headings: [/Panouri din lemn masiv/, /continuous.stave solid wood panels/i, /Massivholzplatten mit durchgehenden Lamellen/],
    },
  ];
  for (const current of cases) {
    const view = render(
      <HelmetProvider>
        <LanguageProvider>
          <MemoryRouter>
            <Capture />
            {current.element}
          </MemoryRouter>
        </LanguageProvider>
      </HelmetProvider>,
    );
    const langs: ('ro' | 'en' | 'de')[] = ['ro', 'en', 'de'];
    for (const [index, language] of langs.entries()) {
      await act(async () => {
        setLanguage?.(language);
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      assert.match(
        screen.getByRole('heading', { level: 1 }).textContent ?? '',
        current.headings[index],
      );
      let htmlLang = document.documentElement.lang;
      for (let attempt = 0; attempt < 20 && htmlLang !== language; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        htmlLang = document.documentElement.lang;
      }
      assert.equal(htmlLang, language);
    }
    view.unmount();
  }
});

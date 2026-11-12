import { render, screen, waitFor, within } from '@testing-library/react';
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
await i18n.use(initReactI18next).init({
  resources: { ro: { translation: ro } },
  lng: 'ro',
  fallbackLng: 'ro',
  interpolation: { escapeValue: false },
});

mock.module('react-helmet-async', { namedExports: helmetEsm });

const WORKS = [
  {
    id: 'work-tava',
    name: 'tava.jpeg',
    category: 'catalog',
    url: '/tava.jpg',
    gallery: ['/tava-2.jpg', '/tava-3.jpg'],
    title: 'Tavă din lemn',
    description: 'Tavă sculptată manual din lemn de fag.',
    price: 250,
  },
  {
    id: 'work-icoana',
    name: 'icoana.jpeg',
    category: 'catalog',
    url: '/icoana.jpg',
    title: 'Icoană',
    description: 'Icoană sculptată în lemn.',
    price: undefined,
  },
  {
    id: 'work-platou',
    name: 'platou.jpeg',
    category: 'catalog',
    url: '/platou.jpg',
    gallery: [],
    title: 'Platou',
    description: 'Platou din lemn masiv.',
    price: 180,
  },
];

mock.module(new URL('../../src/hooks/useSiteAssets.ts', import.meta.url).href, {
  namedExports: {
    useSiteAssets: () => ({ assets: WORKS, loading: false, error: null }),
  },
});

import { LanguageProvider } from '../../src/context/LanguageContext';
const { Catalog } = await import('../../src/pages/Catalog/Catalog.tsx');

// Embla measures slides through offset* sizes, which jsdom leaves at 0 (the
// IntersectionObserver stub lives in tests/ui/setup.mjs). Give every slide a
// 400px box laid out in a row.
const SLIDE_SIZE = 400;
const isSlide = (el: HTMLElement) => el.getAttribute('aria-roledescription') === 'slide';
Object.defineProperties(HTMLElement.prototype, {
  offsetWidth: { configurable: true, get: () => SLIDE_SIZE },
  offsetHeight: { configurable: true, get: () => SLIDE_SIZE },
  offsetLeft: {
    configurable: true,
    get(this: HTMLElement) {
      return isSlide(this) ? Array.from(this.parentElement?.children ?? []).indexOf(this) * SLIDE_SIZE : 0;
    },
  },
  offsetTop: { configurable: true, get: () => 0 },
});
// jsdom returns '' for unset margins; embla parseFloat()s them and gets NaN.
const realGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = ((el: Element, pseudo?: string | null) => {
  const style = realGetComputedStyle(el, pseudo);
  return new Proxy(style, {
    get(target, prop) {
      if (prop === 'getPropertyValue') {
        return (name: string) => target.getPropertyValue(name) || '0px';
      }
      const value = Reflect.get(target, prop) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}) as typeof window.getComputedStyle;

const renderPage = () =>
  render(
    <HelmetProvider>
      <LanguageProvider>
        <MemoryRouter>
          <Catalog />
        </MemoryRouter>
      </LanguageProvider>
    </HelmetProvider>,
  );

const openWork = async (title: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: `Vezi detalii: ${title}` }));
  return await screen.findByRole('dialog', { name: title });
};

it('renders a card with title, description and RON price for each work', () => {
  renderPage();
  for (const work of WORKS) {
    screen.getByRole('heading', { name: work.title });
    screen.getByText(work.description);
  }
  screen.getByText('250.00 RON');
  screen.getByText('180.00 RON');
});

it('shows the photo-count badge only for multi-photo works', () => {
  renderPage();
  screen.getByText('3 poze');
  assert.equal(screen.queryByText('1 poze'), null);
});

it('opens a dialog named after the work and shows the paid price label', async () => {
  renderPage();
  const dialog = await openWork('Tavă din lemn');
  within(dialog).getByText('Realizat la prețul de');
  within(dialog).getByText('250.00 RON');
});

it('renders one thumbnail per photo and a current/total counter', async () => {
  renderPage();
  const dialog = await openWork('Tavă din lemn');
  const thumbs = dialog.querySelectorAll('button[aria-current]');
  assert.equal(thumbs.length, 3);
  assert.equal(thumbs[0].getAttribute('aria-current'), 'true');
  within(dialog).getByText('Foto 1 din 3');
});

it('shows no thumbnails, counter or arrows for a single-photo work', async () => {
  renderPage();
  const dialog = await openWork('Icoană');
  assert.equal(dialog.querySelectorAll('button[aria-current]').length, 0);
  assert.equal(within(dialog).queryByText(/Foto \d+ din \d+/), null);
  assert.equal(within(dialog).queryByRole('button', { name: 'Fotografia anterioară' }), null);
  assert.equal(within(dialog).queryByRole('button', { name: 'Fotografia următoare' }), null);
});

it('navigates to the next work and resets to the first photo', async () => {
  const user = userEvent.setup();
  renderPage();
  await openWork('Icoană');
  // Works are ordered Icoană → Platou → Tavă din lemn.
  await user.click(screen.getByRole('button', { name: /Lucrarea următoare/ }));
  await screen.findByRole('dialog', { name: 'Platou' });
  await user.click(screen.getByRole('button', { name: /Lucrarea următoare/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Tavă din lemn' });
  within(dialog).getByText('Foto 1 din 3');
  // Wraps around back to the first work.
  await user.click(screen.getByRole('button', { name: /Lucrarea anterioară/ }));
  await screen.findByRole('dialog', { name: 'Platou' });
});

it('renders the on-request label when no price is set', async () => {
  renderPage();
  screen.getAllByText('Preț la cerere');
  const dialog = await openWork('Icoană');
  within(dialog).getByText('Preț la cerere');
});

it('closes the dialog with Escape and with the close button', async () => {
  const user = userEvent.setup();
  renderPage();
  await openWork('Platou');
  await user.keyboard('{Escape}');
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));

  await openWork('Platou');
  await user.click(screen.getByRole('button', { name: 'Închide' }));
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
});

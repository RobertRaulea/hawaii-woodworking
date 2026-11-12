import { render, screen, within } from '@testing-library/react';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readFileSync } from 'node:fs';

const resources = Object.fromEntries(
  ['ro', 'en', 'de'].map((language) => [
    language,
    {
      translation: JSON.parse(
        readFileSync(
          new URL(`../../src/i18n/locales/${language}.json`, import.meta.url),
          'utf8',
        ),
      ),
    },
  ]),
);
await i18n.use(initReactI18next).init({
  resources,
  lng: 'ro',
  fallbackLng: 'ro',
  interpolation: { escapeValue: false },
});

Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: () => Promise.resolve(),
});
Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: () => undefined,
});

const { HomeStory } = await import('../../src/components/Home/HomeStory');

it('renders the slogan as the single h1', () => {
  render(<HomeStory />);
  const headings = screen.getAllByRole('heading', { level: 1 });
  assert.equal(headings.length, 1);
  assert.equal(
    headings[0].textContent,
    'Natura creează materia. Noi îi dăm personalitate.',
  );
});

it('renders the about scene as the section h2', () => {
  render(<HomeStory />);
  const heading = screen.getByRole('heading', {
    level: 2,
    hidden: true,
    name: 'Sunt Robert, de la Hawaii Woodworking Sibiu.',
  });
  assert.equal(
    heading.textContent,
    'Sunt Robert, de la Hawaii Woodworking Sibiu.',
  );
});

it('renders eight scene dots with the first marked current', () => {
  render(<HomeStory />);
  const dots = screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-label')?.startsWith('Scena'));
  assert.equal(dots.length, 8);
  assert.equal(dots[0].getAttribute('aria-current'), 'true');
  assert.equal(dots[1].getAttribute('aria-current'), null);
});

it('exposes every scene title in the visually-hidden list', () => {
  render(<HomeStory />);
  const list = screen.getByRole('list');
  const items = within(list).getAllByRole('listitem');
  assert.equal(items.length, 8);
  for (const title of [
    'Vara din curtea bunicii',
    'Eu și mașina CNC',
    'Făcut cu aceeași grijă',
  ]) {
    assert.ok(
      items.some((item) => item.textContent?.includes(title)),
      `missing scene title ${title}`,
    );
  }
});

it('links to the products section', () => {
  render(<HomeStory />);
  const links = screen.getAllByRole('link', { name: 'Vezi produsele' });
  assert.equal(links.length, 1);
  assert.equal(links[0].getAttribute('href'), '#produse');
});

it('renders the poster image immediately and no video before idle', () => {
  const { container } = render(<HomeStory />);
  const poster = container.querySelector('img');
  assert.ok(poster);
  assert.equal(poster.getAttribute('src'), '/videos/atelier-poster.jpg');
  assert.equal(container.querySelector('video'), null);
});

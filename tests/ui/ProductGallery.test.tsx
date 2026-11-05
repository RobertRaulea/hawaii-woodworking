import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readFileSync } from 'node:fs';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { MemoryRouter, Link, useLocation } from 'react-router-dom';

const en = JSON.parse(
  readFileSync(new URL('../../src/i18n/locales/en.json', import.meta.url), 'utf8'),
);
await i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Embla measures slides through offset* sizes, which jsdom leaves at 0 (the
// IntersectionObserver stub lives in tests/ui/setup.mjs). Give every slide a
// 400px box laid out in a row.
const SLIDE_SIZE = 400;
const isSlide = (el: HTMLElement) => el.getAttribute('aria-roledescription') === 'slide';
Object.defineProperties(HTMLElement.prototype, {
  // The track is as wide as the viewport; slides overflow it.
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

const { ProductGallery } = await import('../../src/components/ProductGallery/ProductGallery.tsx');
const { ImageCarousel } = await import('../../src/components/ImageCarousel/ImageCarousel.tsx');

const IMAGES = ['/a.jpg', '/b.jpg', '/c.jpg'];
const ALT = 'Walnut box';

const thumb = (n: number) => screen.getByRole('button', { name: `${ALT} - ${n}` });
// Plain DOM query on purpose: role queries are slow and ignore the rail while
// the modal lightbox hides it from the accessibility tree.
const activeLabel = () =>
  document.querySelector('button[aria-current="true"]')?.getAttribute('aria-label');
const counter = (n: number, total = IMAGES.length) => screen.getByText(`${n} / ${total}`);
// The main image is a role=button region; the expand icon button shares its label.
const mainImage = () =>
  screen
    .getAllByRole('button', { name: 'View fullscreen' })
    .find((el) => el.querySelector('[aria-roledescription="slide"]')) as HTMLElement;

it('renders one thumbnail per image and marks the first as current', () => {
  render(<ProductGallery images={IMAGES} alt={ALT} />);
  const rail = screen.getByLabelText(ALT);
  assert.equal(within(rail).getAllByRole('button').length, IMAGES.length);
  assert.equal(thumb(1).getAttribute('aria-current'), 'true');
  assert.equal(thumb(2).getAttribute('aria-current'), 'false');
  counter(1);
});

it('honours initialIndex', () => {
  render(<ProductGallery images={IMAGES} alt={ALT} initialIndex={2} />);
  assert.equal(thumb(3).getAttribute('aria-current'), 'true');
  counter(3);
});

it('selects the clicked thumbnail and moves the main carousel to it', async () => {
  render(<ProductGallery images={IMAGES} alt={ALT} />);
  await userEvent.setup().click(thumb(3));
  await waitFor(() => assert.equal(thumb(3).getAttribute('aria-current'), 'true'));
  assert.equal(thumb(1).getAttribute('aria-current'), 'false');
  assert.equal(activeLabel(), `${ALT} - 3`);
  counter(3);
  // embla translates the track to the selected slide
  const track = mainImage().querySelector<HTMLElement>('[aria-roledescription="slide"]')
    ?.parentElement as HTMLElement;
  await waitFor(() => assert.notEqual(track.style.transform, ''));
});

it('next and previous buttons change the slide and wrap around', async () => {
  const user = userEvent.setup();
  render(<ProductGallery images={IMAGES} alt={ALT} />);
  const next = screen.getByRole('button', { name: 'Next image' });
  const prev = screen.getByRole('button', { name: 'Previous image' });

  await user.click(next);
  await waitFor(() => assert.equal(activeLabel(), `${ALT} - 2`));
  counter(2);
  await user.click(prev);
  await waitFor(() => assert.equal(activeLabel(), `${ALT} - 1`));
  await user.click(prev);
  await waitFor(() => assert.equal(activeLabel(), `${ALT} - 3`));
  await user.click(next);
  await waitFor(() => assert.equal(activeLabel(), `${ALT} - 1`));
});

it('opens the lightbox on tap and closes it with Escape', async () => {
  const user = userEvent.setup();
  render(<ProductGallery images={IMAGES} alt={ALT} />);
  assert.equal(screen.queryByRole('dialog'), null);

  await user.click(mainImage());
  const dialog = await screen.findByRole('dialog');
  assert.ok(within(dialog).getByRole('button', { name: 'Close' }));
  assert.equal(within(dialog).getAllByRole('group').length, IMAGES.length);

  await user.keyboard('{Escape}');
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
});

it('opens the lightbox from the keyboard on Enter', async () => {
  const user = userEvent.setup();
  render(<ProductGallery images={IMAGES} alt={ALT} />);
  mainImage().focus();
  await user.keyboard('{Enter}');
  await screen.findByRole('dialog');
});

it('arrow keys and buttons navigate inside the lightbox and stay in sync with the rail', async () => {
  const user = userEvent.setup();
  render(<ProductGallery images={IMAGES} alt={ALT} initialIndex={1} />);
  await user.click(mainImage());
  const dialog = await screen.findByRole('dialog');

  await user.keyboard('{ArrowRight}');
  await waitFor(() => assert.equal(activeLabel(), `${ALT} - 3`));
  await user.keyboard('{ArrowLeft}');
  await waitFor(() => assert.equal(activeLabel(), `${ALT} - 2`));
  await user.click(within(dialog).getByRole('button', { name: 'Next image' }));
  await waitFor(() => assert.equal(activeLabel(), `${ALT} - 3`));
  await user.click(within(dialog).getAllByRole('button', { name: `${ALT} - 1` })[0]);
  await waitFor(() => assert.equal(activeLabel(), `${ALT} - 1`));
});

it('renders a fallback image and no rail or arrows when there are no images', () => {
  render(<ProductGallery images={[]} alt={ALT} />);
  const img = screen.getByAltText(`${ALT} - 1`) as HTMLImageElement;
  assert.ok(img.src.startsWith('https://placehold.co/'));
  assert.equal(screen.queryByRole('button', { name: 'Next image' }), null);
  assert.equal(screen.queryByLabelText(ALT), null);
});

it('ImageCarousel arrows do not bubble to the surrounding click handler', async () => {
  const user = userEvent.setup();
  let parentClicks = 0;
  let nextClicks = 0;
  render(
    <div onClick={() => (parentClicks += 1)}>
      <ImageCarousel images={IMAGES} alt={ALT} onNextClick={() => (nextClicks += 1)} />
    </div>,
  );
  await user.click(screen.getByRole('button', { name: 'Next Image' }));
  await user.click(screen.getByRole('button', { name: 'Previous Image' }));
  assert.equal(parentClicks, 0);
  assert.equal(nextClicks, 1);
});

it('ImageCarousel arrows inside a link do not navigate and move the dots', async () => {
  const user = userEvent.setup();
  const Where = () => <p data-testid="where">{useLocation().pathname}</p>;
  render(
    <MemoryRouter initialEntries={['/products']}>
      <Where />
      <Link to="/product/1">
        <ImageCarousel images={IMAGES} alt={ALT} />
      </Link>
    </MemoryRouter>,
  );
  const dots = () =>
    Array.from(document.querySelectorAll('div.absolute.bottom-3 > span')).map((s) =>
      s.className.includes('w-5'),
    );
  assert.deepEqual(dots(), [true, false, false]);
  await user.click(screen.getByRole('button', { name: 'Next Image' }));
  await waitFor(() => assert.deepEqual(dots(), [false, true, false]));
  assert.equal(screen.getByTestId('where').textContent, '/products');
  await user.click(screen.getByRole('button', { name: 'Previous Image' }));
  await waitFor(() => assert.deepEqual(dots(), [true, false, false]));
  assert.equal(screen.getByTestId('where').textContent, '/products');
  // a plain click on the image still follows the link
  await user.click(screen.getAllByRole('img')[0]);
  assert.equal(screen.getByTestId('where').textContent, '/product/1');
});

it('ImageCarousel with one image shows no arrows or dots', () => {
  render(<ImageCarousel images={['/only.jpg']} alt={ALT} />);
  assert.equal(screen.queryByRole('button', { name: 'Next Image' }), null);
  assert.equal(document.querySelector('div.absolute.bottom-3'), null);
});

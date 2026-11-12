import assert from 'node:assert/strict';
import { afterEach, beforeEach, it, mock } from 'node:test';
import { flyToCart } from '../../src/utils/flyToCart.utils.ts';

interface FakeAnimation {
  onfinish: (() => void) | null;
  oncancel: (() => void) | null;
}

interface AnimateCall {
  element: Element;
  animation: FakeAnimation;
}

let animateCalls: AnimateCall[] = [];

const setReducedMotion = (matches: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
};

const addCartTarget = (withBadge = false) => {
  const target = document.createElement('button');
  target.setAttribute('data-cart-icon', '');
  document.body.appendChild(target);
  let badge: HTMLElement | null = null;
  if (withBadge) {
    badge = document.createElement('span');
    badge.setAttribute('data-cart-badge', '');
    target.appendChild(badge);
  }
  return { target, badge };
};

beforeEach(() => {
  animateCalls = [];
  Element.prototype.animate = mock.fn(function (this: Element) {
    const animation: FakeAnimation = { onfinish: null, oncancel: null };
    animateCalls.push({ element: this, animation });
    return animation as unknown as Animation;
  }) as unknown as typeof Element.prototype.animate;
  setReducedMotion(false);
});

afterEach(() => {
  document.body.innerHTML = '';
});

it('appends a fixed image to the body, removes it on finish, and pulses the cart', () => {
  const { target, badge } = addCartTarget(true);
  const source = document.createElement('button');
  document.body.appendChild(source);

  flyToCart(source, '/product.jpg');

  const img = document.body.querySelector('img');
  assert.ok(img, 'flight image is appended');
  assert.equal(img.style.position, 'fixed');
  assert.equal(img.style.pointerEvents, 'none');
  assert.equal(img.getAttribute('aria-hidden'), 'true');
  assert.equal(img.getAttribute('alt'), '');
  assert.equal(img.src.includes('/product.jpg'), true);
  assert.equal(animateCalls.length, 1, 'only the flight animates so far');
  assert.equal(animateCalls[0].element, img);

  animateCalls[0].animation.onfinish?.();

  assert.equal(document.body.querySelector('img'), null, 'image is removed');
  const pulseTargets = animateCalls.slice(1).map((call) => call.element);
  assert.ok(pulseTargets.includes(target), 'cart icon pulses');
  assert.ok(badge && pulseTargets.includes(badge), 'cart badge pulses');
});

it('is a no-op when the cart icon target is missing', () => {
  const source = document.createElement('button');
  document.body.appendChild(source);

  flyToCart(source, '/product.jpg');

  assert.equal(document.body.querySelector('img'), null);
  assert.equal(animateCalls.length, 0);
});

it('is a no-op when the Web Animations API is unavailable', () => {
  Element.prototype.animate = undefined as unknown as typeof Element.prototype.animate;
  addCartTarget();
  const source = document.createElement('button');
  document.body.appendChild(source);

  flyToCart(source, '/product.jpg');

  assert.equal(document.body.querySelector('img'), null);
});

it('skips the flight but still pulses under prefers-reduced-motion', () => {
  setReducedMotion(true);
  const { target, badge } = addCartTarget(true);
  const source = document.createElement('button');
  document.body.appendChild(source);

  flyToCart(source, '/product.jpg');

  assert.equal(document.body.querySelector('img'), null, 'no flight image');
  const pulseTargets = animateCalls.map((call) => call.element);
  assert.ok(pulseTargets.includes(target), 'cart icon pulses');
  assert.ok(badge && pulseTargets.includes(badge), 'cart badge pulses');
});

it('removes the image when the flight is cancelled', () => {
  const { target } = addCartTarget();
  const source = document.createElement('button');
  document.body.appendChild(source);

  flyToCart(source, '/product.jpg');
  animateCalls[0].animation.oncancel?.();

  assert.equal(document.body.querySelector('img'), null);
  const laterTargets = animateCalls.slice(1).map((call) => call.element);
  assert.equal(laterTargets.includes(target), false, 'cancel does not pulse');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { render, screen } from '@testing-library/react';
import { EnvironmentBanner } from '../../src/components/EnvironmentBanner/EnvironmentBanner';

test('test banner provides visible simulated-payment instructions without hiding them on mobile', () => {
  render(<EnvironmentBanner environment="test" />);
  const banner = screen.getByRole('complementary', { name: 'Mediu de test' });
  assert.match(banner.textContent ?? '', /Nu se incaseaza bani/);
  assert.match(banner.textContent ?? '', /4242 4242 4242 4242/);
  assert.doesNotMatch(banner.className, /hidden/);
  assert.match(banner.firstElementChild?.className ?? '', /flex-col.*md:flex-row/);
});

test('production does not expose test instructions', () => {
  render(<EnvironmentBanner environment="production" />);
  assert.equal(screen.queryByRole('complementary'), null);
});

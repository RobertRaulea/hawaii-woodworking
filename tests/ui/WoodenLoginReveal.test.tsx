import { render, screen } from '@testing-library/react';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { WoodenLoginReveal } from '../../src/components/WoodenLoginReveal/WoodenLoginReveal.tsx';

it('children rămân randate și accesibile', () => {
  render(
    <WoodenLoginReveal>
      <button type="button">Conectează-te</button>
    </WoodenLoginReveal>,
  );
  assert.ok(screen.getByRole('button', { name: 'Conectează-te' }));
});

it('păstrează className primit pe wrapper fără a atinge copiii', () => {
  const { container } = render(
    <WoodenLoginReveal className="w-fit max-w-full mx-auto">
      <p>formular</p>
    </WoodenLoginReveal>,
  );
  const wrapper = container.firstElementChild;
  assert.ok(wrapper?.className.includes('w-fit'));
  assert.ok(wrapper?.className.includes('max-w-full'));
  assert.ok(wrapper?.className.includes('mx-auto'));
  assert.ok(screen.getByText('formular'));
});

it('straturile decorative sunt aria-hidden și nu captează pointeri', () => {
  const { container } = render(
    <WoodenLoginReveal>
      <button type="button">Trimite</button>
    </WoodenLoginReveal>,
  );
  const decorative = container.querySelectorAll('[aria-hidden="true"]');
  assert.ok(decorative.length >= 3);
  for (const layer of decorative) {
    assert.ok(
      layer.className.includes('pointer-events-none'),
      layer.className,
    );
    assert.equal(layer.querySelector('button'), null);
  }
});

import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ShippingFormData } from '../../src/types/shipping.types';

let clerkSignedIn = false;
let convexAuthenticated = false;
let saveCalls = 0;
let duplicateEmail = false;
let verificationFails = false;
let savedData: ShippingFormData | null = null;
let createdEmail = '';

const data: ShippingFormData = {
  email: 'tester@example.com', phone: '0712345678',
  firstName: 'Test', lastName: 'Client', password: 'Example-long-pass-42!',
  shippingAddress: { street: 'Test Street 1', city: 'Berlin', county: 'Berlin', postalCode: '10115', country: 'Germany' },
  billingAddress: { street: 'Test Street 1', city: 'Berlin', county: 'Berlin', postalCode: '10115', country: 'Germany' },
  sameAsShipping: true, newsletter: false, acceptPolicy: true, createAccount: true,
};

mock.module('@clerk/clerk-react', { namedExports: {
  useAuth: () => ({ isLoaded: true, isSignedIn: clerkSignedIn }),
  useSignUp: () => ({
    isLoaded: true,
    setActive: async () => { clerkSignedIn = true; },
    signUp: {
      create: async (args: { emailAddress: string }) => {
        if (duplicateEmail) throw { errors: [{ code: 'form_identifier_exists' }] };
        createdEmail = args.emailAddress;
      },
      prepareEmailAddressVerification: async () => {},
      attemptEmailAddressVerification: async () => {
        if (verificationFails) throw { errors: [{ message: 'Cod invalid.' }] };
        return { status: 'complete', createdSessionId: 'session-test' };
      },
    },
  }),
} });
mock.module('convex/react', { namedExports: {
  useConvexAuth: () => ({ isAuthenticated: convexAuthenticated, isLoading: false }),
  useMutation: () => async () => { saveCalls++; },
  useAction: () => async () => { throw new Error('Not expected before payment click'); },
} });
mock.module('../../src/context/CartContext.tsx', { namedExports: {
  useCart: () => ({ state: { items: [{ id: 'product-test', name: 'Demo', price: 25, quantity: 1 }] } }),
} });
mock.module('../../src/context/ShippingContext.tsx', { namedExports: {
  useShipping: () => ({
    shippingData: savedData ?? data,
    setShippingData: (value: ShippingFormData) => { savedData = value; },
  }),
} });
mock.module('../../src/hooks/useCustomerProfile.ts', { namedExports: {
  useCustomerProfile: () => ({ customer: null }),
} });

const { Shipping } = await import('../../src/pages/Shipping/Shipping');
const { Checkout } = await import('../../src/pages/Checkout/Checkout');
const tree = (
  <MemoryRouter initialEntries={['/shipping']}>
    <Routes>
      <Route path="/shipping" element={<Shipping />} />
      <Route path="/checkout" element={<Checkout />} />
    </Routes>
  </MemoryRouter>
);
beforeEach(() => {
  clerkSignedIn = false; convexAuthenticated = false; saveCalls = 0;
  duplicateEmail = false; verificationFails = false; savedData = null; createdEmail = '';
});

test('signup verifies email then waits for Convex authentication before enabling payment', async () => {
  const view = render(tree);
  assert.ok(document.getElementById('clerk-captcha'));
  fireEvent.click(screen.getByRole('button', { name: 'Continuă spre plată' }));
  await screen.findByRole('heading', { name: 'Verifică adresa de email' });
  assert.equal(createdEmail, data.email);
  fireEvent.change(screen.getByRole('textbox', { name: 'Cod de verificare email' }), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verifică și continuă' }));
  const pending = await screen.findByRole('button', { name: 'Se conecteaza contul...' });
  assert.equal((pending as HTMLButtonElement).disabled, true);
  assert.equal(saveCalls, 0, 'new session must not save an unlinked guest profile');
  assert.equal((savedData as ShippingFormData | null)?.password, undefined);
  convexAuthenticated = true;
  view.rerender(tree);
  // A fresh tree forces the mocked auth state to be read again.
  view.rerender(<MemoryRouter initialEntries={['/checkout']}><Checkout /></MemoryRouter>);
  await waitFor(() => assert.equal((screen.getByRole('button', { name: 'Plătește cu cardul' }) as HTMLButtonElement).disabled, false));
});

test('duplicate email stays on signup and explains that an existing account must sign in', async () => {
  duplicateEmail = true;
  render(tree);
  fireEvent.click(screen.getByRole('button', { name: 'Continuă spre plată' }));
  await screen.findByText(/Există deja un cont cu acest email/);
  assert.equal(savedData, null);
  assert.equal(saveCalls, 0);
});

test('failed email verification does not activate a session or reach checkout', async () => {
  verificationFails = true;
  render(tree);
  fireEvent.click(screen.getByRole('button', { name: 'Continuă spre plată' }));
  fireEvent.change(await screen.findByRole('textbox', { name: 'Cod de verificare email' }), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verifică și continuă' }));
  await screen.findByText('Cod invalid.');
  assert.equal(clerkSignedIn, false);
  assert.equal(savedData, null);
});

import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ShippingFormData } from '../../src/types/shipping.types';

let clerkSignedIn = false;
let profile: Record<string, unknown> | null = null;
let profileLoading = false;
let clerkUser: Record<string, unknown> | null = null;
let userLoaded = true;
let savedData: ShippingFormData | null = null;

const address = {
  street: 'Strada Exemplu 10',
  city: 'Sibiu',
  county: 'Sibiu',
  postalCode: '550000',
  country: 'România',
};
const savedProfile = {
  email: 'ana@exemplu.ro',
  phone: '+40722111222',
  firstName: 'Ana',
  lastName: 'Pop',
  shippingAddress: { ...address },
  billingAddress: { ...address },
  newsletter: true,
};
const guestSessionData: ShippingFormData = {
  email: 'altcineva@exemplu.ro',
  phone: '0799999999',
  firstName: 'Oaspete',
  lastName: 'Vechi',
  shippingAddress: { ...address, street: 'Strada Veche 1' },
  billingAddress: { ...address, street: 'Strada Veche 1' },
  sameAsShipping: true,
  newsletter: false,
  acceptPolicy: true,
  createAccount: false,
};

mock.module('@clerk/clerk-react', { namedExports: {
  useAuth: () => ({ isLoaded: true, isSignedIn: clerkSignedIn }),
  useSignUp: () => ({
    isLoaded: true,
    setActive: async () => {},
    signUp: null,
  }),
  useUser: () => ({
    isLoaded: userLoaded,
    isSignedIn: clerkSignedIn,
    user: clerkUser,
  }),
} });
mock.module('convex/react', { namedExports: {
  useConvexAuth: () => ({ isAuthenticated: clerkSignedIn, isLoading: false }),
  useMutation: () => async () => {},
  useQuery: () => undefined,
  useAction: () => async () => {},
} });
mock.module('../../src/context/CartContext.tsx', { namedExports: {
  useCart: () => ({ state: { items: [{ id: 'p1', name: 'Demo', price: 25, quantity: 1 }] } }),
} });
mock.module('../../src/context/ShippingContext.tsx', { namedExports: {
  useShipping: () => ({
    shippingData: savedData,
    setShippingData: (value: ShippingFormData) => { savedData = value; },
    clearShippingData: () => { savedData = null; },
  }),
} });
mock.module('../../src/hooks/useCustomerProfile.ts', { namedExports: {
  useCustomerProfile: () => ({
    customer: profile,
    isLoading: profileLoading,
    isSignedIn: clerkSignedIn,
  }),
} });

const { Shipping } = await import('../../src/pages/Shipping/Shipping');
const tree = (
  <MemoryRouter initialEntries={['/shipping']}>
    <Shipping />
  </MemoryRouter>
);

beforeEach(() => {
  clerkSignedIn = false;
  profile = null;
  profileLoading = false;
  clerkUser = null;
  userLoaded = true;
  savedData = null;
});

const emailInput = () => screen.getByLabelText(/^Email/) as HTMLInputElement;

test('login link is hidden for signed-in visitors and shown to guests', () => {
  clerkSignedIn = true;
  clerkUser = { primaryEmailAddress: { emailAddress: 'ana@exemplu.ro' } };
  const view = render(tree);
  assert.equal(screen.queryByText('Ai deja cont? Conectează-te'), null);
  view.unmount();
  clerkSignedIn = false;
  clerkUser = null;
  render(tree);
  assert.ok(screen.queryByText('Ai deja cont? Conectează-te'));
});

test('saved profile prefills the form and locks the account email', async () => {
  clerkSignedIn = true;
  clerkUser = { primaryEmailAddress: { emailAddress: 'ana@exemplu.ro' } };
  profile = { ...savedProfile };
  render(tree);
  await waitFor(() => assert.equal(emailInput().value, 'ana@exemplu.ro'));
  assert.equal(emailInput().readOnly, true);
  assert.equal((screen.getByLabelText(/^Prenume/) as HTMLInputElement).value, 'Ana');
  assert.equal((screen.getByLabelText(/^Nume/) as HTMLInputElement).value, 'Pop');
  assert.equal((screen.getByLabelText(/^Telefon/) as HTMLInputElement).value, '+40722111222');
  assert.equal(
    (document.getElementById('shippingStreet') as HTMLInputElement).value,
    'Strada Exemplu 10',
  );
  assert.equal(
    (screen.getByRole('checkbox', { name: /Aceeași cu adresa de livrare/ }) as HTMLElement).getAttribute('aria-checked'),
    'true',
  );
});

test('a different saved billing address leaves sameAsShipping unchecked', async () => {
  clerkSignedIn = true;
  clerkUser = { primaryEmailAddress: { emailAddress: 'ana@exemplu.ro' } };
  profile = {
    ...savedProfile,
    billingAddress: { ...address, street: 'Strada Facturare 5' },
  };
  render(tree);
  await waitFor(() => assert.equal(emailInput().value, 'ana@exemplu.ro'));
  assert.equal(
    (screen.getByRole('checkbox', { name: /Aceeași cu adresa de livrare/ }) as HTMLElement).getAttribute('aria-checked'),
    'false',
  );
  assert.equal(
    (document.getElementById('billingStreet') as HTMLInputElement).value,
    'Strada Facturare 5',
  );
});

test('stale local shipping data from another person is overridden by the profile', async () => {
  clerkSignedIn = true;
  clerkUser = { primaryEmailAddress: { emailAddress: 'ana@exemplu.ro' } };
  savedData = { ...guestSessionData };
  profile = { ...savedProfile };
  render(tree);
  await waitFor(() => assert.equal(emailInput().value, 'ana@exemplu.ro'));
  assert.equal((screen.getByLabelText(/^Prenume/) as HTMLInputElement).value, 'Ana');
  assert.equal(
    (document.getElementById('shippingStreet') as HTMLInputElement).value,
    'Strada Exemplu 10',
  );
});

test('in-progress shipping data for the same account email is kept', async () => {
  clerkSignedIn = true;
  clerkUser = { primaryEmailAddress: { emailAddress: 'ana@exemplu.ro' } };
  savedData = { ...guestSessionData, email: 'ANA@exemplu.ro' };
  profile = { ...savedProfile };
  render(tree);
  await waitFor(() => assert.equal(emailInput().value, 'ANA@exemplu.ro'));
  assert.equal((screen.getByLabelText(/^Prenume/) as HTMLInputElement).value, 'Oaspete');
});

test('without a profile, Clerk account data fills email and name', async () => {
  clerkSignedIn = true;
  clerkUser = {
    primaryEmailAddress: { emailAddress: 'clerk@exemplu.ro' },
    firstName: 'ClerkPrenume',
    lastName: 'ClerkNume',
  };
  profile = null;
  render(tree);
  await waitFor(() => assert.equal(emailInput().value, 'clerk@exemplu.ro'));
  assert.equal((screen.getByLabelText(/^Prenume/) as HTMLInputElement).value, 'ClerkPrenume');
  assert.equal((screen.getByLabelText(/^Nume/) as HTMLInputElement).value, 'ClerkNume');
});

test('fields the user already edited are never overwritten by the profile', async () => {
  clerkSignedIn = true;
  clerkUser = { primaryEmailAddress: { emailAddress: 'ana@exemplu.ro' } };
  profileLoading = true;
  const view = render(tree);
  const firstName = screen.getByLabelText(/^Prenume/) as HTMLInputElement;
  fireEvent.change(firstName, { target: { value: 'Editat' } });
  profileLoading = false;
  profile = { ...savedProfile };
  view.rerender(tree);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(firstName.value, 'Editat');
});

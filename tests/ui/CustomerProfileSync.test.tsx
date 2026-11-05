import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { render, screen, waitFor } from '@testing-library/react';

let clerkSignedIn = true;
let convexAuth = true;
let convexAuthLoading = false;
let queryResult: unknown = undefined;
let syncCalls = 0;
let syncResult: unknown = null;

mock.module('@clerk/clerk-react', { namedExports: {
  useAuth: () => ({ isLoaded: true, isSignedIn: clerkSignedIn }),
} });
mock.module('convex/react', { namedExports: {
  useConvexAuth: () => ({ isAuthenticated: convexAuth, isLoading: convexAuthLoading }),
  useQuery: () => queryResult,
  useMutation: () => async () => { syncCalls += 1; return syncResult; },
} });

const { useCustomerProfile } = await import('../../src/hooks/useCustomerProfile');

const Harness = () => {
  const { customer, isLoading, isSignedIn } = useCustomerProfile();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="customer">{customer ? 'yes' : 'no'}</span>
      <span data-testid="signedin">{String(isSignedIn)}</span>
    </div>
  );
};

const loading = () => screen.getByTestId('loading').textContent;
const customer = () => screen.getByTestId('customer').textContent;

beforeEach(() => {
  clerkSignedIn = true;
  convexAuth = true;
  convexAuthLoading = false;
  queryResult = undefined;
  syncCalls = 0;
  syncResult = null;
});

test('links once when the query resolves to null, staying busy until settled', async () => {
  const view = render(<Harness />);
  assert.equal(loading(), 'true');
  assert.equal(syncCalls, 0);
  queryResult = null;
  view.rerender(<Harness />);
  await waitFor(() => assert.equal(syncCalls, 1));
  await waitFor(() => assert.equal(loading(), 'false'));
  assert.equal(customer(), 'no');
  view.rerender(<Harness />);
  assert.equal(syncCalls, 1, 'sync runs once per sign-in');
});

test('an already-linked customer skips the sync entirely', async () => {
  queryResult = { _id: 'customer-1' };
  render(<Harness />);
  await waitFor(() => assert.equal(loading(), 'false'));
  assert.equal(customer(), 'yes');
  assert.equal(syncCalls, 0);
});

test('a link result keeps loading until the query delivers the row', async () => {
  syncResult = { _id: 'customer-1' };
  queryResult = null;
  const view = render(<Harness />);
  await waitFor(() => assert.equal(syncCalls, 1));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(loading(), 'true');
  queryResult = { _id: 'customer-1' };
  view.rerender(<Harness />);
  await waitFor(() => assert.equal(loading(), 'false'));
  assert.equal(customer(), 'yes');
});

test('guests never sync and are not loading', () => {
  clerkSignedIn = false;
  convexAuth = false;
  render(<Harness />);
  assert.equal(loading(), 'false');
  assert.equal(syncCalls, 0);
});

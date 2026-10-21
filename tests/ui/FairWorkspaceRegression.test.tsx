import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConvexProvider } from 'convex/react';
import type { ConvexReactClient } from 'convex/react';
import { getFunctionName } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import { api } from '../../convex/_generated/api';
import { useAdminQuery } from '../../src/hooks/useAdminQuery';
import { fair } from './fixtures';

mock.module('@clerk/clerk-react', {
  namedExports: { useUser: () => ({ user: { id: 'admin-1' } }) },
});
const { AdminFairs } =
  await import('../../src/pages/Admin/Fairs/AdminFairs.tsx');

// Keep the real Convex hooks/subscription lifecycle; replace only the transport.
const transport = () => {
  const results = new Map<string, unknown>([['pos:listFairs', [fair]]]);
  const listeners = new Set<() => void>();
  const connection = { isWebSocketConnected: true };
  const client = {
    watchQuery: (query: FunctionReference<'query'>) => ({
      localQueryResult: () => {
        const value = results.get(getFunctionName(query));
        if (value instanceof Error) throw value;
        return value;
      },
      onUpdate: (callback: () => void) => {
        listeners.add(callback);
        return () => listeners.delete(callback);
      },
      journal: () => undefined,
    }),
    connectionState: () => connection,
    subscribeToConnectionState: () => () => {},
  } as unknown as ConvexReactClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <ConvexProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </ConvexProvider>
    </StrictMode>
  );
  const publish = (name: string, value: unknown) => {
    results.set(name, value);
    act(() => {
      for (const listener of listeners) listener();
    });
  };
  return { wrapper, publish };
};

it('FairWorkspace renders and switches filters with real Convex subscriptions', async () => {
  const { wrapper, publish } = transport();
  render(<AdminFairs />, { wrapper });
  assert.ok(screen.getByRole('heading', { name: 'Târguri' }));
  assert.ok(screen.getByText(fair.name));
  publish('pos:listFairs', [
    fair,
    { ...fair, _id: 'archived-fair', name: 'Târg arhivat', active: false },
  ]);
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: /Arhivate/ }));
  assert.ok(screen.getByText('Târg arhivat'));
  assert.equal(screen.queryByText(fair.name), null);
});

it('inline query args, skip and backend errors remain reactive without render loops', () => {
  const { wrapper, publish } = transport();
  const { result, rerender } = renderHook(
    ({ skip }) =>
      useAdminQuery(
        api.pos.listFairs,
        skip ? 'skip' : { includeArchived: true },
      ),
    { wrapper, initialProps: { skip: false } },
  );
  assert.equal(result.current.data?.[0].name, fair.name);
  rerender({ skip: false });
  publish('pos:listFairs', new Error('Could not find public function'));
  assert.ok(result.current.error);
  rerender({ skip: true });
  assert.equal(result.current.data === undefined, true);
  assert.equal(result.current.error, null);
  publish('pos:listFairs', [fair]);
  rerender({ skip: false });
  assert.equal(result.current.data?.[0].name, fair.name);
});

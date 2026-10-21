import { renderHook } from '@testing-library/react';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import { api } from '../../convex/_generated/api';

const queries = mock.fn<(queries: unknown) => unknown>(() => ({}));
mock.module('convex/react', { namedExports: { useQueries: queries } });
const { useAdminQuery } = await import('../../src/hooks/useAdminQuery.ts');
beforeEach(() => {
  queries.mock.resetCalls();
});

it('un backend nepublicat devine eroare afișabilă, nu excepție în randare', () => {
  queries.mock.mockImplementation(() => ({
    data: new Error('Could not find public function'),
  }));
  const { result } = renderHook(() => useAdminQuery(api.pos.listFairs, {}));
  assert.equal(result.current.data, undefined);
  assert.ok(result.current.error?.includes('publicarea funcțiilor Convex'));
});

it('păstrează rezultatul reactiv tipizat', () => {
  queries.mock.mockImplementation(() => ({ data: [{ name: 'Târg Crăciun' }] }));
  const { result } = renderHook(() => useAdminQuery(api.pos.listFairs, {}));
  assert.equal(result.current.data?.[0].name, 'Târg Crăciun');
  assert.equal(result.current.error, null);
});

import { act, renderHook } from '@testing-library/react';
import { getFunctionName } from 'convex/server';
import assert from 'node:assert/strict';
import { beforeEach, it, mock } from 'node:test';
import { fairId, productId, receipt } from './fixtures';
import type {
  InventoryReceipt,
  NewInventoryRequest,
} from '../../src/types/inventory.types';

const transfer = mock.fn(
  async (args: { requestId: string }): Promise<InventoryReceipt> => ({
    ...receipt,
    requestId: args.requestId,
  }),
);
const archive = mock.fn<(args: unknown) => Promise<InventoryReceipt>>(
  async () => receipt,
);
const lookup = mock.fn<(query: unknown, args: unknown) => unknown>(() => ({
  data: undefined,
  error: null,
}));
mock.module('convex/react', {
  namedExports: {
    useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
      getFunctionName(reference) === 'pos:transfer' ? transfer : archive,
    useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  },
});
mock.module(new URL('../../src/hooks/useAdminQuery.ts', import.meta.url).href, {
  namedExports: { useAdminQuery: lookup },
});
const { useInventoryOperation } =
  await import('../../src/hooks/useInventoryOperation.ts');

const input: NewInventoryRequest = {
  kind: 'transfer',
  fairId,
  productId,
  quantity: 10,
  direction: 'to_fair',
};
const key = 'hawaii:inventory:operation:v1:admin-1';
beforeEach(() => {
  transfer.mock.resetCalls();
  transfer.mock.mockImplementation(async (args) => ({
    ...receipt,
    requestId: args.requestId,
  }));
  archive.mock.resetCalls();
  lookup.mock.mockImplementation(() => ({ data: undefined, error: null }));
});

it('salvează identificatorul înainte de apel și curăță doar după confirmare', async () => {
  transfer.mock.mockImplementation(async (args: { requestId: string }) => {
    assert.equal(
      JSON.parse(localStorage.getItem(key)!).requestId,
      args.requestId,
    );
    return { ...receipt, requestId: args.requestId };
  });
  const { result } = renderHook(() => useInventoryOperation('admin-1'));
  await act(async () => {
    await result.current.start(input);
  });
  assert.equal(result.current.completed?.stockAfter?.onlineStock, 90);
  assert.equal(localStorage.getItem(key), null);
});

it('timeout-ul și reload-ul reiau exact aceeași cerere', async () => {
  transfer.mock.mockImplementationOnce(async () => {
    throw new Error('Connection lost');
  });
  const first = renderHook(() => useInventoryOperation('admin-1'));
  await act(async () => {
    await first.result.current.start(input);
  });
  const checkpoint = JSON.parse(localStorage.getItem(key)!);
  assert.equal(first.result.current.pending?.requestId, checkpoint.requestId);
  first.unmount();
  const second = renderHook(() => useInventoryOperation('admin-1'));
  await act(async () => {
    await second.result.current.retry();
  });
  assert.equal(
    transfer.mock.calls[1].arguments[0].requestId,
    checkpoint.requestId,
  );
  assert.equal(localStorage.getItem(key), null);
});

it('două apăsări simultane trimit o singură mutație', async () => {
  let resolve!: (receipt: InventoryReceipt) => void;
  transfer.mock.mockImplementation(
    (args: { requestId: string }) =>
      new Promise<InventoryReceipt>((done) => {
        resolve = (value) => done({ ...value, requestId: args.requestId });
      }),
  );
  const { result } = renderHook(() => useInventoryOperation('admin-1'));
  let first!: Promise<void>;
  await act(async () => {
    first = result.current.start(input);
    await result.current.start(input);
  });
  assert.equal(transfer.mock.callCount(), 1);
  await act(async () => {
    resolve(receipt);
    await first;
  });
});

it('o confirmare reactivă recuperează operațiunea fără alt transfer', async () => {
  localStorage.setItem(
    key,
    JSON.stringify({ ...input, requestId: receipt.requestId }),
  );
  lookup.mock.mockImplementation(() => ({ data: receipt, error: null }));
  const { result } = renderHook(() => useInventoryOperation('admin-1'));
  assert.equal(result.current.completed?.requestId, receipt.requestId);
  assert.equal(transfer.mock.callCount(), 0);
  assert.equal(localStorage.getItem(key), null);
});

it('stocarea blocată împiedică pornirea unei operațiuni', async () => {
  const { result } = renderHook(() => useInventoryOperation('admin-1'));
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = () => {
    throw new Error('Denied');
  };
  try {
    await act(async () => {
      await result.current.start(input);
    });
    assert.equal(transfer.mock.callCount(), 0);
    assert.equal(result.current.blocked, true);
  } finally {
    Storage.prototype.setItem = original;
  }
});

it('nu pornește o nouă operațiune peste un checkpoint corupt', () => {
  localStorage.setItem(key, '{invalid');
  const { result } = renderHook(() => useInventoryOperation('admin-1'));
  assert.equal(result.current.blocked, true);
  assert.ok(result.current.error.includes('Recuperarea locală'));
});

it('o a doua apăsare după răspunsul rapid nu repetă acțiunea aceluiași dialog', async () => {
  const { result } = renderHook(() => useInventoryOperation('admin-1'));
  const request = { ...input, requestId: 'dialog-operation-000001' };
  await act(async () => {
    await result.current.start(request);
  });
  await act(async () => {
    await result.current.start(request);
  });
  assert.equal(transfer.mock.callCount(), 1);
  assert.equal(result.current.pending, null);
  assert.equal(localStorage.getItem(key), null);
});

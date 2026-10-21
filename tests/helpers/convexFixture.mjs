import assert from 'node:assert/strict';

export const fixture = () => {
  let tables = new Map();
  let sequence = 0;
  let identity = { subject: 'seller-1', role: 'admin' };
  let queue = Promise.resolve();
  let jobs = [];
  const table = (name) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name);
  };
  const seed = (name, id, value) => {
    table(name).set(id, { ...value, _id: id, _creationTime: Date.now() });
  };
  const ctx = {
    auth: { getUserIdentity: async () => identity },
    storage: { getUrl: async () => null },
    scheduler: {
      runAfter: async (delay, fn, args) => {
        const id = `job-${jobs.length + 1}`;
        jobs.push({ id, delay, fn, args: structuredClone(args) });
        return id;
      },
    },
    db: {
      get: async (id) => {
        for (const values of tables.values())
          if (values.has(id)) return structuredClone(values.get(id));
        return null;
      },
      query: (name) => {
        const filters = [];
        let descending = false;
        const builder = {
          withIndex: (_index, callback) => {
            const range = {
              eq: (field, value) => {
                filters.push([field, value]);
                return range;
              },
            };
            callback(range);
            return builder;
          },
          order: (direction) => {
            descending = direction === 'desc';
            return builder;
          },
          collect: async () =>
            [...table(name).values()]
              .filter((value) =>
                filters.every(([field, expected]) => value[field] === expected),
              )
              .sort((a, b) =>
                descending
                  ? b._creationTime - a._creationTime
                  : a._creationTime - b._creationTime,
              )
              .map((value) => structuredClone(value)),
          take: async (limit) => (await builder.collect()).slice(0, limit),
          unique: async () => {
            const values = await builder.collect();
            assert.ok(values.length <= 1, 'index lookup must be unique');
            return values[0] ?? null;
          },
          first: async () => (await builder.collect())[0] ?? null,
        };
        return builder;
      },
      insert: async (name, value) => {
        const id = `${name}-${++sequence}`;
        seed(name, id, value);
        return id;
      },
      patch: async (id, patch) => {
        for (const values of tables.values()) {
          if (values.has(id)) {
            values.set(id, { ...values.get(id), ...structuredClone(patch) });
            return;
          }
        }
        throw new Error('Document not found');
      },
      delete: async (id) => {
        for (const values of tables.values()) if (values.delete(id)) return;
      },
    },
  };
  const run = (fn, args = {}) => {
    const result = queue.then(async () => {
      const snapshot = structuredClone(tables);
      const scheduledBefore = jobs.slice();
      try {
        return await fn._handler(ctx, args);
      } catch (error) {
        tables = snapshot;
        jobs = scheduledBefore;
        throw error;
      }
    });
    queue = result.catch(() => {});
    return result;
  };
  seed('fairs', 'fair-1', {
    name: 'Targ Craciun',
    active: true,
    createdBy: 'seller-1',
  });
  for (const [id, name, price, quantity] of [
    ['magnet', 'Magnet Sibiu', 25, 34],
    ['brad', 'Ornament Brad', 30, 28],
    ['stea', 'Stea lemn', 20, 16],
  ]) {
    seed('products', id, { name, price, stock: 100, trackStock: true });
    seed('fairInventory', `balance-${id}`, {
      fairId: 'fair-1',
      productId: id,
      quantity,
    });
  }
  return {
    ctx,
    run,
    seed,
    all: (name) => [...table(name).values()],
    jobs: () => jobs,
    identity: (next) => {
      identity = next;
    },
  };
};

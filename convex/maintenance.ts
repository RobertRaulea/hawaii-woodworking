import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

const BUSINESS_TABLES = [
  "customers",
  "orders",
  "orderEvents",
  "posAttempts",
  "posSales",
  "fairs",
  "fairAssignments",
  "fairInventory",
  "staffDirectory",
  "stockMovements",
  "stockOperations",
  "transfers",
  "transferEvents",
  "inventoryOperations",
  "demoAssets",
  "rateLimits",
] as const;

// Wipes historical business data for a clean production launch. Keeps config,
// siteAssets, categories, and products untouched.
export const wipeBusinessData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const deleted: Record<string, number> = {};
    for (const table of BUSINESS_TABLES) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      deleted[table] = docs.length;
    }
    return { deleted };
  },
});

// Deletes explicit storage IDs. Internal-only: callable via `convex run` or
// the dashboard, never from the public API. Pass an audited orphan list.
export const deleteStorageFiles = internalMutation({
  args: { ids: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.storage.delete(id);
    }
    return { deleted: args.ids.length };
  },
});

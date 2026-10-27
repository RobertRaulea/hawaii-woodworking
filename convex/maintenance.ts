import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

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

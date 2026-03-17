import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Public mutation for seeding (no auth required for seed scripts)
export const seedCategories = mutation({
  args: {
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, { force }) => {
    const existing = await ctx.db.query("categories").collect();

    if (!force && existing.length > 0) {
      return {
        inserted: 0,
        existing: existing.length,
        skipped: true,
      };
    }

    if (force && existing.length > 0) {
      await Promise.all(existing.map((c) => ctx.db.delete(c._id)));
    }

    const categories = [
      "Bowls",
      "Cutting Boards",
      "Home Goods",
      "Boxes",
      "Furniture",
    ];

    const ids = await Promise.all(
      categories.map((name) => ctx.db.insert("categories", { name }))
    );

    return {
      inserted: ids.length,
      existing: existing.length,
      skipped: false,
      ids,
    };
  },
});

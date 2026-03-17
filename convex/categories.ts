import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
  },
});

export const create = mutation({
  args: { 
    name: v.string(),
    name_ro: v.optional(v.string()),
    name_en: v.optional(v.string()),
    name_de: v.optional(v.string()),
  },
  handler: async (ctx, { name, name_ro, name_en, name_de }) => {
    await requireAdmin(ctx);

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Category name cannot be empty");
    }

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", trimmedName))
      .first();

    if (existing) {
      throw new Error("A category with this name already exists");
    }

    return await ctx.db.insert("categories", { 
      name: trimmedName,
      name_ro,
      name_en,
      name_de,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    name_ro: v.optional(v.string()),
    name_en: v.optional(v.string()),
    name_de: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, name_ro, name_en, name_de }) => {
    await requireAdmin(ctx);

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Category name cannot be empty");
    }

    const category = await ctx.db.get(id);
    if (!category) {
      throw new Error("Category not found");
    }

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", trimmedName))
      .first();

    if (existing && existing._id !== id) {
      throw new Error("A category with this name already exists");
    }

    await ctx.db.patch(id, { 
      name: trimmedName,
      name_ro,
      name_en,
      name_de,
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);

    const category = await ctx.db.get(id);
    if (!category) {
      throw new Error("Category not found");
    }

    const productsUsingCategory = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("category"), category.name))
      .first();

    if (productsUsingCategory) {
      throw new Error(
        "Cannot delete category: it is being used by one or more products"
      );
    }

    await ctx.db.delete(id);
    return { deleted: true };
  },
});

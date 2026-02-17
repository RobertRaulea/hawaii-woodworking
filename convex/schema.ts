import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Convex schema for Hawaii Woodworking
export default defineSchema({
  products: defineTable({
    name: v.string(),
    price: v.number(),
    images: v.optional(v.array(v.string())),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    stripe_product_id: v.optional(v.string()),
    stripe_price_id: v.optional(v.string()),
  }),
  siteAssets: defineTable({
    name: v.string(),
    category: v.string(),
    storageId: v.id("_storage"),
  })
    .index("by_category", ["category"])
    .index("by_category_name", ["category", "name"]),
});

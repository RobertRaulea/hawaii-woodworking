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
  customers: defineTable({
    clerkUserId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    isRegistered: v.optional(v.boolean()),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    shippingAddress: v.object({
      street: v.string(),
      city: v.string(),
      county: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
    billingAddress: v.object({
      street: v.string(),
      city: v.string(),
      county: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
    newsletter: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"]),

  orders: defineTable({
    customerId: v.id("customers"),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    ),
    total: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_customerId", ["customerId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"])
    .index("by_stripeSessionId", ["stripeSessionId"]),

  siteAssets: defineTable({
    name: v.string(),
    category: v.string(),
    storageId: v.id("_storage"),
  })
    .index("by_category", ["category"])
    .index("by_category_name", ["category", "name"]),

  categories: defineTable({
    name: v.string(),
  }).index("by_name", ["name"]),
});

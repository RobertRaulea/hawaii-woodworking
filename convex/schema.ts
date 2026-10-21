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
    name_ro: v.optional(v.string()),
    name_en: v.optional(v.string()),
    name_de: v.optional(v.string()),
    description_ro: v.optional(v.string()),
    description_en: v.optional(v.string()),
    description_de: v.optional(v.string()),
    stock: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    trackStock: v.optional(v.boolean()),
    sku: v.optional(v.string()),
    posFavorite: v.optional(v.boolean()),
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
      }),
    ),
    total: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    invoiceId: v.optional(v.string()),
    invoicePdfUrl: v.optional(v.string()),
    createdAt: v.number(),
    paymentConfirmedAt: v.optional(v.number()),
    inventoryStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("applied"),
        v.literal("needs_review"),
      ),
    ),
    inventoryAppliedAt: v.optional(v.number()),
    inventoryAppliedItems: v.optional(
      v.array(
        v.object({
          productId: v.id("products"),
          name: v.string(),
          quantity: v.number(),
        }),
      ),
    ),
    inventoryError: v.optional(v.string()),
    inventoryReviewReason: v.optional(
      v.union(v.literal("stock"), v.literal("cancelled")),
    ),
    inventoryUnfulfilledItems: v.optional(
      v.array(
        v.object({
          productId: v.id("products"),
          name: v.string(),
          quantity: v.number(),
        }),
      ),
    ),
    postPaymentScheduledAt: v.optional(v.number()),
  })
    .index("by_customerId", ["customerId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"])
    .index("by_inventoryStatus", ["inventoryStatus"])
    .index("by_stripeSessionId", ["stripeSessionId"]),

  siteAssets: defineTable({
    name: v.string(),
    category: v.string(),
    storageId: v.id("_storage"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
  })
    .index("by_category", ["category"])
    .index("by_category_name", ["category", "name"]),

  categories: defineTable({
    name: v.string(),
    name_ro: v.optional(v.string()),
    name_en: v.optional(v.string()),
    name_de: v.optional(v.string()),
  }).index("by_name", ["name"]),

  fairs: defineTable({
    name: v.string(),
    active: v.boolean(),
    createdBy: v.string(),
    archivedAt: v.optional(v.number()),
    archivedBy: v.optional(v.string()),
    archiveOperationId: v.optional(v.id("inventoryOperations")),
  }),

  fairInventory: defineTable({
    fairId: v.id("fairs"),
    productId: v.id("products"),
    quantity: v.number(),
  })
    .index("by_fair_product", ["fairId", "productId"])
    .index("by_product", ["productId"])
    .index("by_fair", ["fairId"]),

  posAttempts: defineTable({
    requestId: v.string(),
    sellerId: v.string(),
    fairId: v.id("fairs"),
    paymentMethod: v.union(v.literal("cash"), v.literal("card")),
    status: v.union(
      v.literal("prepared"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        quantity: v.number(),
        unitPriceCents: v.number(),
      }),
    ),
    subtotalCents: v.number(),
    discountCents: v.number(),
    discountReason: v.string(),
    totalCents: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_fair_status", ["fairId", "status"])
    .index("by_seller_status", ["sellerId", "status"]),

  posSales: defineTable({
    requestId: v.string(),
    sellerId: v.string(),
    fairId: v.id("fairs"),
    paymentMethod: v.union(v.literal("cash"), v.literal("card")),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        quantity: v.number(),
        unitPriceCents: v.number(),
      }),
    ),
    subtotalCents: v.number(),
    discountCents: v.number(),
    discountReason: v.string(),
    totalCents: v.number(),
    receivedCents: v.optional(v.number()),
    changeCents: v.number(),
    completedAt: v.number(),
    businessDate: v.string(),
  })
    .index("by_request", ["requestId"])
    .index("by_fair_date", ["fairId", "businessDate"]),

  stockMovements: defineTable({
    requestId: v.string(),
    productId: v.id("products"),
    fairId: v.optional(v.id("fairs")),
    location: v.union(v.literal("workshop"), v.literal("fair")),
    kind: v.union(
      v.literal("transfer"),
      v.literal("sale"),
      v.literal("online_sale"),
    ),
    quantity: v.number(),
    balanceAfter: v.number(),
    actorId: v.string(),
    saleId: v.optional(v.id("posSales")),
    orderId: v.optional(v.id("orders")),
    operationId: v.optional(v.id("inventoryOperations")),
    reason: v.optional(v.literal("fair_archive")),
    createdAt: v.number(),
  }).index("by_request", ["requestId"]),

  inventoryOperations: defineTable({
    requestId: v.string(),
    actorId: v.string(),
    kind: v.union(v.literal("transfer"), v.literal("archive")),
    fairId: v.id("fairs"),
    fairName: v.string(),
    productId: v.optional(v.id("products")),
    productName: v.optional(v.string()),
    direction: v.optional(
      v.union(v.literal("to_fair"), v.literal("to_online")),
    ),
    quantity: v.optional(v.number()),
    returnedUnits: v.optional(v.number()),
    returnedProducts: v.optional(v.number()),
    expectedInventory: v.optional(
      v.array(v.object({ productId: v.id("products"), quantity: v.number() })),
    ),
    stockAfter: v.optional(
      v.object({
        onlineStock: v.union(v.number(), v.null()),
        onlinePhysicalStock: v.optional(v.union(v.number(), v.null())),
        onlineHeldOrders: v.optional(v.union(v.number(), v.null())),
        fairStock: v.number(),
        fairsStock: v.number(),
        totalStock: v.union(v.number(), v.null()),
      }),
    ),
    legacyReplay: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_request", ["requestId"]),
});

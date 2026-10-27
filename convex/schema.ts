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
    active: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    archivedBy: v.optional(v.string()),
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
        v.literal("released"),
      ),
    ),
    fulfillmentStatus: v.optional(
      v.union(v.literal("preparing"), v.literal("packed")),
    ),
    assignedTo: v.optional(v.string()),
    assignedAt: v.optional(v.number()),
    checklist: v.optional(
      v.array(
        v.object({
          productId: v.id("products"),
          checked: v.boolean(),
        }),
      ),
    ),
    packedAt: v.optional(v.number()),
    shippedAt: v.optional(v.number()),
    shippedBy: v.optional(v.string()),
    awb: v.optional(v.string()),
    carrier: v.optional(v.string()),
    deliveredAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancelledBy: v.optional(v.string()),
    cancelReason: v.optional(v.string()),
    refundStatus: v.optional(v.literal("manual_required")),
    inventoryRestockedAt: v.optional(v.number()),
    shipping: v.optional(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        address: v.object({
          street: v.string(),
          city: v.string(),
          county: v.string(),
          postalCode: v.string(),
          country: v.string(),
        }),
      }),
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
    startsOn: v.optional(v.string()),
    endsOn: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    archivedBy: v.optional(v.string()),
    archiveOperationId: v.optional(v.id("inventoryOperations")),
  }),

  fairAssignments: defineTable({
    fairId: v.id("fairs"),
    userId: v.string(),
    assignedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_fair", ["fairId"])
    .index("by_fair_user", ["fairId", "userId"]),

  staffDirectory: defineTable({
    userId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("admin"), v.literal("seller"), v.literal("atelier")),
    ),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),

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
      v.literal("receipt"),
      v.literal("adjustment"),
      v.literal("count"),
      v.literal("transfer_out"),
      v.literal("transfer_in"),
      v.literal("online_cancel"),
    ),
    quantity: v.number(),
    balanceAfter: v.number(),
    actorId: v.string(),
    saleId: v.optional(v.id("posSales")),
    orderId: v.optional(v.id("orders")),
    operationId: v.optional(v.id("inventoryOperations")),
    stockOperationId: v.optional(v.id("stockOperations")),
    transferId: v.optional(v.id("transfers")),
    reason: v.optional(
      v.union(
        v.literal("fair_archive"),
        v.literal("production"),
        v.literal("damaged"),
        v.literal("lost"),
        v.literal("found"),
        v.literal("correction"),
        v.literal("other"),
        v.literal("count"),
      ),
    ),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_location_fair", ["location", "fairId"])
    .index("by_product_location", ["productId", "location", "fairId"]),

  stockOperations: defineTable({
    requestId: v.string(),
    actorId: v.string(),
    kind: v.union(
      v.literal("receipt"),
      v.literal("adjustment"),
      v.literal("count"),
    ),
    productId: v.id("products"),
    productName: v.string(),
    location: v.union(v.literal("workshop"), v.literal("fair")),
    fairId: v.optional(v.id("fairs")),
    fairName: v.optional(v.string()),
    delta: v.number(),
    quantityBefore: v.number(),
    quantityAfter: v.number(),
    expectedQuantity: v.optional(v.number()),
    countedQuantity: v.optional(v.number()),
    reason: v.union(
      v.literal("production"),
      v.literal("damaged"),
      v.literal("lost"),
      v.literal("found"),
      v.literal("correction"),
      v.literal("other"),
      v.literal("count"),
    ),
    note: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_request", ["requestId"]),

  transfers: defineTable({
    status: v.union(
      v.literal("requested"),
      v.literal("draft"),
      v.literal("in_transit"),
      v.literal("partially_received"),
      v.literal("received"),
      v.literal("cancelled"),
    ),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    fromLocation: v.optional(
      v.union(v.literal("workshop"), v.literal("fair")),
    ),
    fromFairId: v.optional(v.id("fairs")),
    toLocation: v.union(v.literal("workshop"), v.literal("fair")),
    toFairId: v.optional(v.id("fairs")),
    lines: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        requestedQuantity: v.optional(v.number()),
        quantity: v.number(),
        shippedQuantity: v.number(),
        receivedQuantity: v.number(),
      }),
    ),
    note: v.optional(v.string()),
    shippedAt: v.optional(v.number()),
    shippedBy: v.optional(v.string()),
    receivedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancelledBy: v.optional(v.string()),
    cancelReason: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_createdBy", ["createdBy"]),

  transferEvents: defineTable({
    transferId: v.id("transfers"),
    requestId: v.string(),
    actorId: v.string(),
    kind: v.union(
      v.literal("requested"),
      v.literal("accepted"),
      v.literal("created"),
      v.literal("updated"),
      v.literal("shipped"),
      v.literal("received"),
      v.literal("cancelled"),
    ),
    lines: v.optional(
      v.array(
        v.object({ productId: v.id("products"), quantity: v.number() }),
      ),
    ),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_transfer", ["transferId"]),

  orderEvents: defineTable({
    orderId: v.id("orders"),
    requestId: v.string(),
    actorId: v.string(),
    kind: v.union(
      v.literal("claimed"),
      v.literal("released"),
      v.literal("reassigned"),
      v.literal("checked"),
      v.literal("note"),
      v.literal("packed"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
    note: v.optional(v.string()),
    data: v.optional(
      v.object({
        productId: v.optional(v.id("products")),
        checked: v.optional(v.boolean()),
        fromUser: v.optional(v.string()),
        toUser: v.optional(v.string()),
        awb: v.optional(v.string()),
        carrier: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_request", ["requestId"]),

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

  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
});

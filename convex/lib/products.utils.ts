import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type ProductStatus = "active" | "inactive" | "archived";

export const productStatus = (product: Doc<"products">): ProductStatus =>
  product.archivedAt
    ? "archived"
    : product.active === false
      ? "inactive"
      : "active";

export const isSellable = (product: Doc<"products">) =>
  productStatus(product) === "active";

const skuPrefix = (name: string) => {
  const initials = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  return initials || "PRD";
};

export const nextSku = (name: string, taken: ReadonlySet<string>) => {
  const base = skuPrefix(name);
  for (let index = 1; ; index += 1) {
    const candidate = `${base}-${String(index).padStart(2, "0")}`;
    if (!taken.has(candidate)) return candidate;
  }
};

export const generateSku = async (ctx: QueryCtx, name: string) => {
  const products = await ctx.db.query("products").collect();
  const taken = new Set(
    products
      .map((product) => product.sku?.toUpperCase())
      .filter((sku): sku is string => Boolean(sku)),
  );
  return nextSku(name, taken);
};

export const validateSku = async (
  ctx: QueryCtx,
  excludeId: Id<"products"> | undefined,
  rawSku: string,
) => {
  const sku = rawSku.trim().toUpperCase();
  if (sku.length > 80) throw new ConvexError("SKU prea lung.");
  if (sku) {
    const products = await ctx.db.query("products").collect();
    if (
      products.some(
        (product) =>
          product._id !== excludeId &&
          product.sku?.toUpperCase() === sku,
      )
    )
      throw new ConvexError("SKU deja utilizat.");
  }
  return sku;
};

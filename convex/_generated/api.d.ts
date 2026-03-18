/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as categories from "../categories.js";
import type * as checkout from "../checkout.js";
import type * as customers from "../customers.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_storage from "../lib/storage.js";
import type * as lib_translations from "../lib/translations.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as seedCategories from "../seedCategories.js";
import type * as siteAssets from "../siteAssets.js";
import type * as stripeVerify from "../stripeVerify.js";
import type * as stripeWebhook from "../stripeWebhook.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  categories: typeof categories;
  checkout: typeof checkout;
  customers: typeof customers;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/storage": typeof lib_storage;
  "lib/translations": typeof lib_translations;
  orders: typeof orders;
  products: typeof products;
  seedCategories: typeof seedCategories;
  siteAssets: typeof siteAssets;
  stripeVerify: typeof stripeVerify;
  stripeWebhook: typeof stripeWebhook;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

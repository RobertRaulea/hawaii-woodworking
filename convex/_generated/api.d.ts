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
import type * as demoCatalog from "../demoCatalog.js";
import type * as demoData from "../demoData.js";
import type * as fulfillment from "../fulfillment.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_demoProducts from "../lib/demoProducts.js";
import type * as lib_directory from "../lib/directory.js";
import type * as lib_environment from "../lib/environment.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_storage from "../lib/storage.js";
import type * as lib_translations from "../lib/translations.js";
import type * as orders from "../orders.js";
import type * as pos from "../pos.js";
import type * as postPayment from "../postPayment.js";
import type * as products from "../products.js";
import type * as reports from "../reports.js";
import type * as seedCategories from "../seedCategories.js";
import type * as siteAssets from "../siteAssets.js";
import type * as staff from "../staff.js";
import type * as stripeVerify from "../stripeVerify.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as transfers from "../transfers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  categories: typeof categories;
  checkout: typeof checkout;
  customers: typeof customers;
  demoCatalog: typeof demoCatalog;
  demoData: typeof demoData;
  fulfillment: typeof fulfillment;
  http: typeof http;
  inventory: typeof inventory;
  "lib/auth": typeof lib_auth;
  "lib/demoProducts": typeof lib_demoProducts;
  "lib/directory": typeof lib_directory;
  "lib/environment": typeof lib_environment;
  "lib/permissions": typeof lib_permissions;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/storage": typeof lib_storage;
  "lib/translations": typeof lib_translations;
  orders: typeof orders;
  pos: typeof pos;
  postPayment: typeof postPayment;
  products: typeof products;
  reports: typeof reports;
  seedCategories: typeof seedCategories;
  siteAssets: typeof siteAssets;
  staff: typeof staff;
  stripeVerify: typeof stripeVerify;
  stripeWebhook: typeof stripeWebhook;
  transfers: typeof transfers;
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

import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { UserIdentity } from "convex/server";
import type { StaffRole } from "./permissions";

export const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.includes("@") && email.length <= 320 ? email : null;
};

const identityName = (identity: UserIdentity): string | undefined => {
  const name = identity.name;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
};

/**
 * Upserts the caller into staffDirectory so admin screens can show
 * emails instead of Clerk user ids. Only staff identities (checked by
 * the caller) are recorded; needs an email from the JWT or the client.
 */
export const recordStaffUser = async (
  ctx: MutationCtx,
  identity: UserIdentity,
  fallback?: { email?: string; name?: string },
  role?: StaffRole,
): Promise<void> => {
  const email = normalizeEmail(identity.email) ?? normalizeEmail(fallback?.email);
  if (!email) return;
  const name = identityName(identity) ?? fallback?.name?.trim() ?? undefined;
  const existing = await ctx.db
    .query("staffDirectory")
    .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
    .unique();
  if (!existing) {
    await ctx.db.insert("staffDirectory", {
      userId: identity.subject,
      email,
      name,
      role,
      updatedAt: Date.now(),
    });
    return;
  }
  if (
    existing.email !== email ||
    existing.name !== name ||
    (role !== undefined && existing.role !== role)
  ) {
    await ctx.db.patch(existing._id, {
      email,
      name,
      ...(role !== undefined ? { role } : {}),
      updatedAt: Date.now(),
    });
  }
};

/**
 * Accepts either a Clerk user id (`user_…`) or a staff email already
 * present in the directory, and returns the Clerk user id.
 */
export const resolveStaffUserId = async (
  ctx: QueryCtx | MutationCtx,
  identifier: string,
): Promise<string | null> => {
  const value = identifier.trim();
  if (/^user_[A-Za-z0-9]{1,100}$/.test(value)) return value;
  const email = normalizeEmail(value);
  if (!email) return null;
  const entry = await ctx.db
    .query("staffDirectory")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  return entry?.userId ?? null;
};

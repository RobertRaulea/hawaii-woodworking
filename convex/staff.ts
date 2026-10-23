import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getStaff, requirePermission } from "./lib/auth";
import {
  normalizeEmail,
  recordStaffUser,
  resolveStaffUserId,
} from "./lib/directory";
import { HOME_PATH, parseRole, permissionsFor } from "./lib/permissions";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const staff = await getStaff(ctx);
    if (!staff) return null;
    const { identity, role } = staff;
    return {
      userId: identity.subject,
      role,
      permissions: permissionsFor(role),
      homePath: role ? HOME_PATH[role] : null,
    };
  },
});

export const register = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await getStaff(ctx);
    if (!staff?.role) throw new ConvexError("Forbidden: staff only");
    await recordStaffUser(ctx, staff.identity, args, staff.role);
    return null;
  },
});

export const directory = query({
  args: {},
  handler: async (ctx) => {
    const staff = await getStaff(ctx);
    if (!staff?.role) throw new ConvexError("Forbidden: staff only");
    const rows = await ctx.db.query("staffDirectory").collect();
    return rows.map((row) => ({
      userId: row.userId,
      email: row.email,
      name: row.name,
      role: row.role,
      updatedAt: row.updatedAt,
    }));
  },
});

/**
 * Staff members with the seller role — used to pick fair sellers from a
 * dropdown instead of typing ids or emails.
 */
export const sellers = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "fairs.manage");
    const rows = await ctx.db.query("staffDirectory").collect();
    return rows
      .filter((row) => row.role === "seller")
      .map((row) => ({
        userId: row.userId,
        email: row.email,
        name: row.name,
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  },
});

/**
 * Admin-managed upsert for colleagues who have not signed in yet, so
 * their Clerk user id already maps to an email everywhere in admin.
 */
export const setDirectoryEntry = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "staff.manage");
    const userId = args.userId.trim();
    if (!/^user_[A-Za-z0-9]{1,100}$/.test(userId)) {
      throw new ConvexError("Introdu un ID Clerk valid (user_…).");
    }
    const email = normalizeEmail(args.email);
    if (!email) {
      throw new ConvexError("Introdu o adresă de email validă.");
    }
    const roleInput = args.role?.trim();
    const parsedRole = roleInput ? parseRole(roleInput) : null;
    if (roleInput && !parsedRole) {
      throw new ConvexError(
        "Rol invalid. Folosește admin, seller sau atelier.",
      );
    }
    const role = parsedRole ?? undefined;
    const name = args.name?.trim() || undefined;
    const existing = await ctx.db
      .query("staffDirectory")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name,
        ...(role ? { role } : {}),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("staffDirectory", {
        userId,
        email,
        name,
        role,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const listFairSellers = query({
  args: { fairId: v.id("fairs") },
  handler: async (ctx, { fairId }) => {
    await requirePermission(ctx, "fairs.manage");
    const rows = await ctx.db
      .query("fairAssignments")
      .withIndex("by_fair", (q) => q.eq("fairId", fairId))
      .collect();
    return rows.map((row) => ({ userId: row.userId, createdAt: row.createdAt }));
  },
});

export const assignFairSeller = mutation({
  args: { fairId: v.id("fairs"), userId: v.string() },
  handler: async (ctx, { fairId, userId }) => {
    const { identity } = await requirePermission(ctx, "fairs.manage");
    const sellerId = await resolveStaffUserId(ctx, userId);
    if (!sellerId) {
      throw new ConvexError(
        "Introdu un ID Clerk valid sau emailul unui cont staff cunoscut.",
      );
    }
    const fair = await ctx.db.get(fairId);
    if (!fair?.active) {
      throw new ConvexError("Târgul nu este activ.");
    }
    const existing = await ctx.db
      .query("fairAssignments")
      .withIndex("by_fair_user", (q) =>
        q.eq("fairId", fairId).eq("userId", sellerId),
      )
      .unique();
    if (existing) return existing;
    const id = await ctx.db.insert("fairAssignments", {
      fairId,
      userId: sellerId,
      assignedBy: identity.subject,
      createdAt: Date.now(),
    });
    return (await ctx.db.get(id))!;
  },
});

export const unassignFairSeller = mutation({
  args: { fairId: v.id("fairs"), userId: v.string() },
  handler: async (ctx, { fairId, userId }) => {
    await requirePermission(ctx, "fairs.manage");
    const existing = await ctx.db
      .query("fairAssignments")
      .withIndex("by_fair_user", (q) =>
        q.eq("fairId", fairId).eq("userId", userId.trim()),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});

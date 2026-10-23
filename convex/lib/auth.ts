import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import type { UserIdentity } from "convex/server";
import type { Id } from "../_generated/dataModel";
import { hasPermission, parseRole } from "./permissions";
import type { Permission, StaffRole } from "./permissions";
import { recordStaffUser } from "./directory";

type AuthCtx = QueryCtx | MutationCtx | ActionCtx;
type DbCtx = QueryCtx | MutationCtx;

export interface Staff {
  identity: UserIdentity;
  role: StaffRole | null;
}

/**
 * The role is read from the Clerk JWT custom claim `role`
 * (set via Clerk Dashboard → JWT Templates → convex → Claims),
 * falling back to `publicMetadata.role`. Only the exact staff
 * role strings are accepted; anything else means no internal access.
 */
const roleOf = (identity: UserIdentity): StaffRole | null => {
  const id = identity as Record<string, unknown>;
  return parseRole(
    id.role ??
      (id.publicMetadata as Record<string, unknown> | undefined)?.role,
  );
};

// Queries and actions cannot write; only mutations refresh the directory.
const canWrite = (ctx: AuthCtx): ctx is MutationCtx => {
  const db = (ctx as Partial<MutationCtx>).db;
  return db !== undefined && "insert" in db;
};

export const getStaff = async (ctx: AuthCtx): Promise<Staff | null> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const role = roleOf(identity);
  if (role && canWrite(ctx)) await recordStaffUser(ctx, identity, undefined, role);
  return { identity, role };
};

export const requirePermission = async (
  ctx: AuthCtx,
  permission: Permission,
): Promise<Staff & { role: StaffRole }> => {
  const staff = await getStaff(ctx);
  if (!staff) {
    throw new Error("Unauthorized: not authenticated");
  }
  if (!hasPermission(staff.role, permission)) {
    throw new Error(`Forbidden: ${permission} required`);
  }
  return staff as Staff & { role: StaffRole };
};

/**
 * Verify the caller is authenticated and has the "admin" role.
 * Throws if unauthenticated or not an admin.
 */
export const requireAdmin = async (ctx: AuthCtx) => {
  const staff = await getStaff(ctx);
  if (!staff) {
    throw new Error("Unauthorized: not authenticated");
  }
  if (staff.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }
  return staff.identity;
};

/**
 * 'all' when the role can read every location's stock,
 * otherwise the set of fairs assigned to the caller.
 */
export const authorizedFairIds = async (
  ctx: DbCtx,
  staff: Staff,
): Promise<"all" | Set<Id<"fairs">>> => {
  if (hasPermission(staff.role, "inventory.readAll")) return "all";
  const rows = await ctx.db
    .query("fairAssignments")
    .withIndex("by_user", (q) => q.eq("userId", staff.identity.subject))
    .collect();
  return new Set(rows.map((row) => row.fairId));
};

export const canAccessFair = async (
  ctx: DbCtx,
  staff: Staff,
  fairId: Id<"fairs">,
): Promise<boolean> => {
  const ids = await authorizedFairIds(ctx, staff);
  return ids === "all" || ids.has(fairId);
};

export const requireFairAccess = async (
  ctx: DbCtx,
  staff: Staff,
  fairId: Id<"fairs">,
): Promise<void> => {
  if (!(await canAccessFair(ctx, staff, fairId))) {
    throw new ConvexError("Nu ai acces la acest târg.");
  }
};

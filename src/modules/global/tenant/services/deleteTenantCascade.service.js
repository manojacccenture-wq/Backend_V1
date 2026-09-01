import mongoose from "mongoose";
import { getGlobalDB, getSharedDB } from "../../../../config/db/db.js";
import { getTenantModel } from "../models/tenant.model.js";
import { getMembershipModel } from "../../membership/models/membership.model.js";
import { getUserModel } from "../../users/models/user.model.js";
import { getTenantProductModel } from "../../tenantProduct/models/tenantProduct.model.js";
import { getUserProductModel } from "../../userProduct/models/userProduct.model.js";
import { getTenantSubscriptionModel } from "../../plans/models/tenantSubscription.model.js";
import { getBusinessRoleModel } from "../../../businessRole/models/businessRole.model.js";
import { getRoleModel } from "../../roles/models/roles.models.js";
import { getPolicyModel } from "../../../iam/models/policy.model.js";
import { getRolePolicyModel } from "../../../iam/models/rolePolicy.model.js";
import { getDemoRequestModel } from "../../../demoRequest/models/demoRequest.model.js";
import { deprovisionFoodERPTenant, deprovisionFoodERPUser } from "../../../../shared/services/fooderp/fooderpProvisioning.service.js";
import { getRedis } from "../../../../config/redis/redis.js";

/**
 * Cascade-deletes a tenant and all its exclusive data.
 *
 * Phase 1 — MongoDB transaction on GLOBAL_DB (atomic):
 *   Memberships → UserProducts → TenantProducts → TenantSubscriptions
 *   → BusinessRoles → Tenant-specific RolePolicies → Tenant-specific Roles
 *   → Tenant-specific Policies → Exclusive Users → Tenant record
 *
 * Phase 2 — Post-commit cleanup (non-critical):
 *   Shared DB settings → Redis cache keys
 *
 * Returns a summary of what was deleted.
 */
export const deleteTenantCascade = async (tenantId) => {
  const db = getGlobalDB();
  const session = await db.startSession();

  const summary = {
    deletedTenant: null,
    deletedMemberships: 0,
    deletedUserProducts: 0,
    deletedTenantProducts: 0,
    deletedSubscriptions: 0,
    deletedBusinessRoles: 0,
    deletedRoles: 0,
    deletedPolicies: 0,
    deletedRolePolicies: 0,
    deletedUsers: 0,
  };

  try {
    session.startTransaction();

    // ── Models ──────────────────────────────────────────────────────────
    const Tenant = getTenantModel();
    const Membership = getMembershipModel();
    const User = getUserModel();
    const TenantProduct = getTenantProductModel();
    const UserProduct = getUserProductModel();
    const TenantSubscription = getTenantSubscriptionModel();
    const BusinessRole = getBusinessRoleModel();
    const Role = getRoleModel();
    const Policy = getPolicyModel();
    const RolePolicy = getRolePolicyModel();

    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    // ── 1. Validate tenant exists ───────────────────────────────────────
    const tenant = await Tenant.findOne({ _id: tenantObjectId }).session(session);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // ── 2. Find all memberships for this tenant → collect user IDs ──────
    const memberships = await Membership.find({ tenantId: tenantObjectId })
      .select("userId")
      .session(session)
      .lean();

    const allUserIds = [...new Set(memberships.map((m) => m.userId.toString()))];

    // ── 2b. Capture user emails before deletion (for DemoRequest cleanup) ──
    const userEmails = [];
    if (allUserIds.length > 0) {
      const usersWithEmail = await User.find({ _id: { $in: allUserIds.map(id => new mongoose.Types.ObjectId(id)) } })
        .select("email")
        .session(session)
        .lean();
      userEmails.push(...usersWithEmail.map(u => u.email).filter(Boolean));
    }

    // ── 3. Determine exclusive users (no other memberships) ─────────────
    const exclusiveUserIds = [];
    for (const userId of allUserIds) {
      const otherMembershipCount = await Membership.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        tenantId: { $ne: tenantObjectId },
        isActive: true,
      }).session(session);

      if (otherMembershipCount === 0) {
        exclusiveUserIds.push(new mongoose.Types.ObjectId(userId));
      }
    }

    // ── 4. Delete Memberships for this tenant ───────────────────────────
    const membershipResult = await Membership.deleteMany(
      { tenantId: tenantObjectId },
      { session }
    );
    summary.deletedMemberships = membershipResult.deletedCount;

    // ── 5. Delete UserProducts for this tenant ──────────────────────────
    const userProductResult = await UserProduct.deleteMany(
      { tenantId: tenantObjectId },
      { session }
    );
    summary.deletedUserProducts = userProductResult.deletedCount;

    // ── 6. Delete TenantProducts for this tenant ────────────────────────
    const tenantProductResult = await TenantProduct.deleteMany(
      { tenantId: tenantObjectId },
      { session }
    );
    summary.deletedTenantProducts = tenantProductResult.deletedCount;

    // ── 7. Delete TenantSubscriptions for this tenant ───────────────────
    const subscriptionResult = await TenantSubscription.deleteMany(
      { tenantId: tenantObjectId },
      { session }
    );
    summary.deletedSubscriptions = subscriptionResult.deletedCount;

    // ── 8. Delete BusinessRoles for this tenant ─────────────────────────
    const businessRoleResult = await BusinessRole.deleteMany(
      { tenantId: tenantObjectId },
      { session }
    );
    summary.deletedBusinessRoles = businessRoleResult.deletedCount;

    // ── 9. Find tenant-specific roles (NOT global) ──────────────────────
    const tenantRoles = await Role.find({ tenantId: tenantObjectId })
      .select("_id")
      .session(session)
      .lean();

    const tenantRoleIds = tenantRoles.map((r) => r._id);

    // ── 10. Delete RolePolicies for tenant-specific roles ───────────────
    if (tenantRoleIds.length > 0) {
      const rolePolicyResult = await RolePolicy.deleteMany(
        { roleId: { $in: tenantRoleIds } },
        { session }
      );
      summary.deletedRolePolicies = rolePolicyResult.deletedCount;
    }

    // ── 11. Delete tenant-specific roles ────────────────────────────────
    const roleResult = await Role.deleteMany(
      { tenantId: tenantObjectId },
      { session }
    );
    summary.deletedRoles = roleResult.deletedCount;

    // ── 12. Delete tenant-specific policies ─────────────────────────────
    const policyResult = await Policy.deleteMany(
      { tenantId: tenantObjectId },
      { session }
    );
    summary.deletedPolicies = policyResult.deletedCount;

    // ── 13. Delete exclusive users (no other memberships, not SYSTEM_ADMIN) ─
    if (exclusiveUserIds.length > 0) {
      const userResult = await User.deleteMany(
        {
          _id: { $in: exclusiveUserIds },
          role: { $ne: "SYSTEM_ADMIN" },
        },
        { session }
      );
      summary.deletedUsers = userResult.deletedCount;
    }

    // ── 14. Delete the Tenant record ────────────────────────────────────
    await Tenant.deleteOne({ _id: tenantObjectId }, { session });
    summary.deletedTenant = tenant.name;

    // ── 15. Commit transaction ──────────────────────────────────────────
    await session.commitTransaction();

    // ── Phase 2: Post-commit cleanup (non-critical) ────────────────────
    await postCommitCleanup(tenantId, exclusiveUserIds, userEmails, summary);

    return summary;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Post-commit cleanup: Redis cache + shared DB settings.
 * These are non-critical — if they fail, the core deletion is already committed.
 */
const postCommitCleanup = async (tenantId, exclusiveUserIds, userEmails, summary) => {
  try {
    // ── Redis cache cleanup ─────────────────────────────────────────────
    const redis = getRedis();
    if (redis) {
      // Clear tenant cache
      await redis.del(`tenant:${tenantId}`).catch(() => {});

      // Clear user context caches for exclusive users
      for (const userId of exclusiveUserIds) {
        const uid = userId.toString();
        await redis.del(`ctx:${uid}:${tenantId}`).catch(() => {});
        await redis.del(`auth:session:${uid}`).catch(() => {});
        await redis.del(`auth:email:${uid}`).catch(() => {});

        // Clear all refresh tokens for this user
        const refreshKeys = await redis.keys(`refresh:${uid}:*`).catch(() => []);
        if (refreshKeys.length > 0) {
          await redis.del(...refreshKeys).catch(() => {});
        }
      }
    }

    // ── Shared DB settings cleanup ──────────────────────────────────────
    const sharedDB = getSharedDB();
    if (sharedDB) {
      await sharedDB
        .collection("settings")
        .deleteMany({ tenantId: new mongoose.Types.ObjectId(tenantId) })
        .catch(() => {});
    }

    // ── DemoRequest status update ────────────────────────────────────────
    if (userEmails.length > 0) {
      const DemoRequest = getDemoRequestModel();
      await DemoRequest.updateMany(
        { workEmail: { $in: userEmails }, status: "activated" },
        { $set: { status: "deleted" } }
      ).catch(() => {});
    }

    // FoodERP user & tenant deprovision
    if (exclusiveUserIds.length > 0) {
      for (const userId of exclusiveUserIds) {
        await deprovisionFoodERPUser(tenantId, userId.toString());
      }
    }
    // Only need to call this once per tenant, not in a loop!
    await deprovisionFoodERPTenant(tenantId);
  } catch {
    // Non-critical — log but don't throw
    console.warn("[TENANT_DELETE] Post-commit cleanup encountered non-critical errors");
  }
};

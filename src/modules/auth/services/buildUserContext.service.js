import mongoose from "mongoose";
import { getMembershipModel } from "../../global/membership/models/membership.model.js";
import { getRedis } from "../../../config/redis/redis.js";
import { getCompiledPermissions } from "../../iam/services/policy.service.js";

/**
 * Build a Tenant-Aware Security Context (IAM Only)
 * 
 * Optimized for performance:
 * - Fetches context only for the requested tenant
 * - Uses tenant-specific Redis caching (ctx:userId:tenantId)
 */
export const buildUserContext = async (userId, tenantId = null) => {
  const redis = getRedis();
  
  // 1. ✅ CHECK TENANT-AWARE CACHE
  const cacheKey = `ctx:${userId}:${tenantId || "global"}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const Membership = getMembershipModel();

  // 2. ✅ CHECK FOR GLOBAL SUPER ADMIN (Platform Access)
  // Super Admins can impersonate ANY tenant even without a specific membership.
  const globalMembership = await Membership.findOne({ 
    userId: new mongoose.Types.ObjectId(userId), 
    tenantId: null,
    isActive: true 
  }).populate("roleId", "code name").lean();

  const isGlobalSuperAdmin = globalMembership?.roleId?.code === "SUPER_ADMIN";

  // 3. ✅ RESOLVE MEMBERSHIP OR IMPERSONATION
  let membership = null;
  
  if (tenantId) {
    // Try to find a specific membership for this tenant
    membership = await Membership.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      isActive: true
    }).populate("roleId", "code name").lean();

    // 🔥 Super Admin Bypass: If no specific membership, use their global privileges
    if (!membership && isGlobalSuperAdmin) {
      membership = {
        userId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
        roleId: globalMembership.roleId,
        productId: null
      };
    }
  } else {
    // No tenant requested, default to Global context
    membership = globalMembership;
  }

  // 4. ✅ AUTO-FALLBACK (For standard users who don't send a header)
  if (!membership && !tenantId) {
    membership = await Membership.findOne({ 
      userId: new mongoose.Types.ObjectId(userId), 
      isActive: true 
    })
    .populate("roleId", "code name")
    .lean();
  }

  if (!membership) {
    return null;
  }

  // 5. ✅ IAM PERMISSION RESOLUTION
  const roleIds = [membership.roleId._id];
  const permissions = await getCompiledPermissions(roleIds);

  const context = {
    tenantId: membership.tenantId,
    productId: membership.productId,
    role: membership.roleId.code,
    roleIds,
    permissions,
    isSuperAdmin: membership.roleId.code === "SUPER_ADMIN"
  };

  // 6. ✅ CACHE IN REDIS
  await redis.set(cacheKey, JSON.stringify(context), {
    EX: 60 * 15,
  });

  return context;
};

/**
 * Utility to fetch all memberships for a user
 */
export const getUserMemberships = async (userId) => {
  const Membership = getMembershipModel();
  return await Membership.find({ 
    userId: new mongoose.Types.ObjectId(userId), 
    isActive: true 
  })
  .populate("roleId", "code name")
  .lean();
};
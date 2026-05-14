import mongoose from "mongoose";
import { getMembershipModel } from "../../global/membership/models/membership.model.js";
import { getRedis } from "../../../config/redis/redis.js";

// ❌ REMOVED: import { getCompiledPermissions } from "../../iam/services/policy.service.js";

/**
 * Build a Tenant-Aware Security Context
 * 
 * Migrated to use Business Roles for direct capability mapping.
 */
export const buildUserContext_Business_Role = async (userId, tenantId = null) => {
  const redis = getRedis();

  // 1. CHECK TENANT-AWARE CACHE
  const cacheKey = `ctx:${userId}:${tenantId || "global"}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached); // Fast return if cached
  }

  const Membership = getMembershipModel();
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const tenantObjectId = tenantId ? new mongoose.Types.ObjectId(tenantId) : null;

  const result = await Membership.aggregate([
    {
      $match: {
        userId: userObjectId,
        isActive: true,
        ...(tenantObjectId ? { tenantId: tenantObjectId } : {}), 
      },
    },
    {
      $sort: { tenantId: 1 }
    },
    // 🔗 Populate Business Role (Replaced legacy IAM roles)
    {
      $lookup: {
        from: "businessroles", // Matches the collection name in your DB
        localField: "businessRoleId",
        foreignField: "_id",
        as: "businessRole",
      },
    },
    // Use preserveNullAndEmptyArrays just in case a user hasn't been migrated yet
    { $unwind: { path: "$businessRole", preserveNullAndEmptyArrays: true } }, 
    
    // 🔗 Get user products
    {
      $lookup: {
        from: "userproducts",
        let: { userId: "$userId", tenantId: "$tenantId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$userId"] },
                  { $eq: ["$tenantId", "$$tenantId"] },
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
        ],
        as: "userProducts",
      },
    },
    // 🔗 Get actual product details
    {
      $lookup: {
        from: "products",
        let: { productIds: "$userProducts.productId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$_id", "$$productIds"] },
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
          {
            $project: { code: 1, name: 1 },
          },
        ],
        as: "products",
      },
    },
    // ✅ Final shape
    {
      $project: {
        tenantId: 1,
        businessRole: 1, // Extracting the business role object
        products: 1,
      },
    }
  ]);

  const membership = result[0] || null;

  if (membership) {
    // 🔥 Directly extract capabilities from the Business Role document
    const permissions = membership.businessRole?.capabilities || [];
    const isSuperAdmin = !membership.tenantId;

    membership.permissions = permissions;
    membership.isSuperAdmin = isSuperAdmin;

    // Caches for 1 hour (3600 seconds)
    await redis.set(cacheKey, JSON.stringify(membership), "EX", 3600);
  }

  return membership;
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
    .select("-__v")
    .populate("businessRoleId", "name capabilities") // Updated to populate business role
    .populate("tenantId", "name")
    .populate("productId", "name code")
    .lean();
};
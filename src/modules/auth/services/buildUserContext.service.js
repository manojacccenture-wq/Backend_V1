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
        ...(tenantObjectId ? { tenantId: tenantObjectId } : { tenantId: null }),
      },
    },
    // 🔗 Populate role
    {
      $lookup: {
        from: "roles",
        localField: "roleId",
        foreignField: "_id",
        as: "role",
      },
    },
    { $unwind: "$role" },
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
        roleId: "$role",
        products: 1,
      },
    },
    {
      $unset: ["roleId.__v"]
    }
  ]);

  const membership = result[0] || null;

  // 🚀 PERFORMANCE FIX: Actually save to Redis so the next call is ultra-fast
  if (membership) {
    // Caches for 1 hour (3600 seconds) - adjust time as needed
    await redis.set(cacheKey, JSON.stringify(membership), "EX", 3600);
  }

  return membership; // 🐛 BUG FIX: You were missing this return statement!
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
    .select("-productId -__v") // 👈 All exclusions: This is perfectly valid
    .populate("roleId", "code name") // 👈 All inclusions: Implicitly removes __v
    .populate("tenantId", "name")
    .lean();
};
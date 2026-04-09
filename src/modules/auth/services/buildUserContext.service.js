import mongoose from "mongoose";
import { getMembershipModel } from "../../global/membership/models/membership.model.js";
import { getRedis } from "../../../config/redis/redis.js";

export const buildUserContext = async (userId) => {
  const redis = getRedis();
  const cacheKey = `ctx:${userId}`;

  // ✅ 1. CHECK CACHE
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const Membership = getMembershipModel();

  // ✅ 2. AGGREGATION (ROLE + PERMISSIONS)
  const result = await Membership.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      },
    },

    // 🔗 JOIN ROLE
    {
      $lookup: {
        from: "roles",
        localField: "roleId",
        foreignField: "_id",
        pipeline: [
          { $project: { code: 1 } } // 🔥 only what you need
        ],
        as: "role",
      },
    },
    { $unwind: "$role" },

    // 🔗 JOIN ROLE PERMISSIONS
    {
      $lookup: {
        from: "rolepermissions",
        localField: "roleId",
        foreignField: "roleId",
        as: "rolePermissions",
      },
    },
    {
      $unwind: {
        path: "$rolePermissions",
        preserveNullAndEmptyArrays: true, // ⚡ avoid crash if no permissions
      },
    },

    // 🔗 JOIN PERMISSIONS
    {
      $lookup: {
        from: "permissions",
        localField: "rolePermissions.permissions",
        foreignField: "_id",
        as: "permissions",
      },
    },

    // 🎯 FINAL SHAPE
    {
      $project: {
        tenantId: 1,
        productId: 1,
        role: "$role.code",
        permissions: {
          $map: {
            input: "$permissions",
            as: "perm",
            in: "$$perm.name",
          },
        },
      },
    },
  ]);

  // ✅ 3. BUILD CONTEXTS
  const contexts = result.map((r) => ({
    tenantId: r.tenantId,
    productId: r.productId,
    role: r.role,
    permissions: [...new Set(r.permissions || [])],
  }));

  // ✅ SUPER ADMIN CHECK
  const isSuperAdmin = contexts.some(
    (c) => c.role === "SUPER_ADMIN"
  );

  const response = { contexts, isSuperAdmin };

  // ✅ 4. CACHE IN REDIS
  await redis.set(cacheKey, JSON.stringify(response), {
    EX: 60 * 30, // 30 minutes
  });

  return response;
};
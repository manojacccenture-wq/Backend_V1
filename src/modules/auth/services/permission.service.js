import mongoose from "mongoose";
import { getMembershipModel } from "../../global/membership/models/membership.model.js";
import { getRedis } from "../../../config/redis/redis.js";

export const getUserPermissions = async (userId) => {
  const redis = getRedis();
  const cacheKey = `perm:${userId}`;

  //  1. CHECK CACHE
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const Membership = getMembershipModel();

  //  2. SINGLE AGGREGATION
  const result = await Membership.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      },
    },
    {
      $lookup: {
        from: "rolepermissions",
        localField: "roleId",
        foreignField: "roleId",
        as: "rolePermissions",
      },
    },
    { $unwind: "$rolePermissions" },

    {
      $lookup: {
        from: "permissions",
        localField: "rolePermissions.permissionId",
        foreignField: "_id",
        as: "permission",
      },
    },
    { $unwind: "$permission" },

    {
      $group: {
        _id: null,
        permissions: { $addToSet: "$permission.name" }, // remove duplicates
      },
    },
  ]);



  const permissionNames = result[0]?.permissions || [];

  //  3. STORE IN REDIS
  await redis.set(cacheKey, JSON.stringify(permissionNames), {
    EX: 60 * 60, // 1 hour
  });

  return permissionNames;
};
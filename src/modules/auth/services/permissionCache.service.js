import { getRedis } from "../../../config/redis/redis.js";


export const clearUserPermissionCache = async (userId) => {
  const redis = getRedis();
  await redis.del(`perm:${userId}`);
};
import { getRedis } from "../../../../config/redis/redis.js";
import { asyncHandler } from "../../../../shared/utils/asyncHandler/asyncHandler.js";

export const demoRateLimiter = asyncHandler(async (req, res, next) => {
  const redis = getRedis();
  
  // Get client IP address
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const key = `rate_limit:demo_request:${ip}`;

  // Increment request count for this IP
  const requests = await redis.incr(key);

  if (requests === 1) {
    // Set expiry to 1 hour (3600 seconds) on the first request
    await redis.expire(key, 3600);
  }

  if (requests > 3) {
    const error = new Error("Too many requests from this IP, please try again after an hour.");
    error.statusCode = 429;
    throw error;
  }

  next();
});

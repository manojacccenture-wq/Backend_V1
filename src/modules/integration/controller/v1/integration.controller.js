import { getRedis } from "../../../../config/redis/redis.js";

export const getFoodErpRoles = async (req, res, next) => {
  const redis = getRedis();
  const cacheKey = "fooderp:operational-roles";

  // Try fetching from cache first
  const cachedRoles = await redis.get(cacheKey);
  if (cachedRoles) {
    return res.json(JSON.parse(cachedRoles));
  }

  const url = process.env.FOODERP_BACKEND_URL;
  if (!url) {
    return res.status(500).json({ message: "FoodERP Backend URL is not configured." });
  }

  try {
    const fetchOptions = {
      method: 'GET',
      headers: {
        "x-internal-api-key": process.env.INTERNAL_API_KEY || "",
      }
    };

    // In dev, bypass SSL issues securely without requiring external undici package
    let originalTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    if (process.env.NODE_ENV !== "production" && url.startsWith("https")) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    const response = await fetch(`${url}/api/sso/operational-roles`, fetchOptions);
    
    // Restore TLS setting to prevent bleeding insecure state to other requests
    if (process.env.NODE_ENV !== "production" && url.startsWith("https")) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTls;
    }
    
    if (!response.ok) {
       const status = response.status;
       if (status === 401 || status === 403) {
           return res.status(502).json({ message: "Integration authorization failed." });
       }
       throw new Error(`Integration returned status ${status}`);
    }

    const roles = await response.json();

    // Cache the successful response for 1 hour
    await redis.set(cacheKey, JSON.stringify(roles), {
      EX: 3600, // 1 hour
    });

    return res.json(roles);
  } catch (error) {
    console.error("[Integration] Failed to fetch FoodERP roles:", error.message);
    return res.status(502).json({ message: "FoodERP integration unavailable." });
  }
};

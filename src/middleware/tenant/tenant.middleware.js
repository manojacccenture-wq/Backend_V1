import { getRedis } from "../../config/redis/redis.js";
import { getTenantModel } from "../../modules/global/tenant/models/tenant.model.js";
import logger from "../../shared/services/logger/logger.js";

export const tenantMiddleware = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    const redis = getRedis();

    if (!redis) {
      return res.status(500).json({ msg: "Redis not initialized" });
    }

    // 🔑 Redis key
    const key = `tenant:${tenantId}`;

    let tenantData;

    // 🟢 1. Check cache
    const cached = await redis.get(key);

    if (cached) {
      tenantData = JSON.parse(cached);
             logger.info(`⚡ Tenant from Redis`);
    } else {
      // 🔴 2. Fetch from DB
      const Tenant = getTenantModel();

      const tenant = await Tenant.findById(tenantId);

      if (!tenant) {
        return res.status(404).json({ msg: "Tenant not found" });
      }

      tenantData = {
        dataMode: tenant.dataMode,
        dbName: tenant.dbName || null,
      };

      // 💾 Save in Redis
      await redis.set(key, JSON.stringify(tenantData), {
        EX: 3600, // 1 hour TTL
      });


      logger.info(`💾 Tenant cached in Redis`);
    }

    // 🔥 Attach to request
    req.tenant = tenantData;

    next();
  } catch (error) {
    logger.error("Tenant error:", error);
    res.status(500).json({ msg: "Tenant error" });
  }
};
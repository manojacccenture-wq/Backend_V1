import { checkCapability } from "../services/businessRole.service.js";

/**
 * requireCapability(capabilityKey)
 *
 * NEW Business Role middleware — completely separate from authorizePolicy().
 * Used ONLY on new routes that adopt the Business Role system.
 * Old routes continue using authorizePolicy() — this never replaces it.
 *
 * Usage:
 *   router.get("/something", accessAuthMiddleware, contextMiddleware, requireCapability("users.view"), handler);
 *
 * @param {string} capabilityKey - e.g. "users.view", "orders.create"
 */
export const requireCapability = (capabilityKey) => {
  return async (req, res, next) => {
    try {
      const userId   = req.user?.userId;
      const tenantId = req.context?.tenantId;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      if (!tenantId) {
        // Super Admin or global context — skip business role check
        return next();
      }

      const allowed = await checkCapability(userId, tenantId, capabilityKey);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Access denied: requires capability '${capabilityKey}'`,
        });
      }

      next();
    } catch (err) {
      console.error("[BusinessRole] requireCapability error:", err);
      res.status(500).json({ success: false, message: "Authorization check failed" });
    }
  };
};

import { evaluateAccess, getUserRoleIds } from "../services/policy.service.js";

/**
 * Middleware to enforce Policy-Based Access Control (IAM Strategy 4)
 * 
 * Usage:
 * router.post('/orders', authorizePolicy('orders:create'), orderController.create);
 * router.get('/orders/:id', authorizePolicy('orders:view', (req) => req.params.id), orderController.get);
 * 
 * @param {string} action - The action being performed (e.g., 'orders:create')
 * @param {string|Function} resource - The resource identifier or a function to extract it from req
 */
export const authorizePolicy = (action, resource = "*") => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      // Get tenantId from headers or existing context middleware
      const tenantId = req.headers["x-tenant-id"] || req.context?.tenantId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      // Resolve resource identifier
      let resourceId = resource;
      if (typeof resource === "function") {
        resourceId = resource(req);
      }

      // 1. Fetch the user's role IDs for the active context (tenant or global)
      const roleIds = await getUserRoleIds(userId, tenantId);

      // 2. Evaluate access across all attached policies
      const isAuthorized = await evaluateAccess(roleIds, action, resourceId);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: Policy evaluation failed",
          details: {
            action,
            resource: resourceId
          }
        });
      }

      // Access granted
      next();
    } catch (error) {
      console.error("IAM Policy Middleware Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error during policy authorization"
      });
    }
  };
};

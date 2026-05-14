import { buildUserContext } from "../services/buildUserContext.service.js";
import { buildUserContext_Business_Role } from "../services/buildUserContext_Business_Role.service.js";

/**
 * Bridge Context Middleware
 * 
 * Optimized to use tenant-aware caching via buildUserContext.
 */
export const contextMiddleware = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.headers["x-tenant-id"] || null;

    // 🔥 Use the high-performance, cached context builder
    // const context = await buildUserContext(userId, tenantId); //For I am roles'
    const context = await buildUserContext_Business_Role(userId, tenantId); //For I am roles
    

    if (!context && tenantId) {
      return res.status(403).json({ 
        success: false,
        message: "Access Denied: No active membership found for this tenant" 
      });
    }

    if (!context) {
       // Allow empty context if no tenant provided (e.g., public or global check)
       req.context = { isSuperAdmin: false };
       return next();
    }

    // 5. 🔥 SINGLE SOURCE OF TRUTH: IAM ONLY
    // We populate req.user.permissions for backward compatibility
    req.user.permissions = context.permissions;

    // 6. Set up Request Context for both systems
    req.context = {
      role: context.role,
      // roleIds: context.roleIds || [], // Ensure we have IDs if needed
      roleIds: context.businessRole ? [context.businessRole._id] : [],
      tenantId: context.tenantId,
      isSuperAdmin: context.isSuperAdmin,
    };

    next();
  } catch (err) {
    
    res.status(500).json({ 
      success: false,
      message: "Security Context Initialization Failed" 
    });
  }
};
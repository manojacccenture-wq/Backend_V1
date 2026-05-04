/**
 * Role Hierarchy Guard Middleware (Phase 2 — Strategy 2)
 *
 * Prevents a user from creating or deleting a role that has equal or
 * higher authority than their own. Authority is measured by `level`:
 *   - Lower level = more powerful  (ADMIN = 1, STAFF = 50)
 *   - A user at level 10 can ONLY manage roles at level > 10
 *
 * Usage in routes:
 *   router.post("/",      accessAuthMiddleware, contextMiddleware, authorizeRoleLevel, createRole);
 *   router.delete("/:id", accessAuthMiddleware, contextMiddleware, authorizeRoleLevelForDelete, deleteRole);
 */

import { getRoleModel } from "../../global/roles/models/roles.models.js";

// ─── For CREATE: check the incoming level vs the requesting user's role ───────

/**
 * Guards role creation. The requesting user's role level must be STRICTLY
 * lower (= more powerful) than the level they are trying to create.
 *
 * e.g., A Manager (level 10) cannot create another Manager (level 10)
 *        or an Admin (level 1), but CAN create a Staff (level 50) role.
 */
export const authorizeRoleLevel = async (req, res, next) => {
  try {
    // Super Admins bypass all hierarchy checks
    if (req.context?.isSuperAdmin) return next();

    const roleIds      = req.context?.roleIds || [];
    const requestedLevel = parseInt(req.body.level) || 100; // level tenant wants to assign

    if (roleIds.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: No active role found for this user in this tenant",
      });
    }

    // Find the requesting user's highest-authority role (lowest level number)
    const Role = getRoleModel();
    const userRoles = await Role.find({ _id: { $in: roleIds } }).lean();

    if (!userRoles.length) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Could not resolve user's role hierarchy",
      });
    }

    // The user's effective authority level = their LOWEST (most powerful) level
    const userEffectiveLevel = Math.min(...userRoles.map((r) => r.level ?? 100));

    // Guard: user can only create roles BELOW their own level (higher number)
    if (requestedLevel <= userEffectiveLevel) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: You (level ${userEffectiveLevel}) cannot create a role at level ${requestedLevel}. You can only create roles at a level higher than ${userEffectiveLevel}.`,
        hint: `Try a level above ${userEffectiveLevel}, e.g., level ${userEffectiveLevel + 1} or higher.`,
      });
    }

    // Passed — inject effective level for downstream use if needed
    req.context.userEffectiveLevel = userEffectiveLevel;
    next();
  } catch (err) {
    console.error("Role Hierarchy Guard Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal error during role hierarchy authorization",
    });
  }
};


// ─── For DELETE: resolve the target role's level, then compare ───────────────

/**
 * Guards role deletion. Prevents a user from deleting a role that is at
 * an equal or higher authority level than their own.
 *
 * e.g., A Manager (level 10) cannot delete an Admin role (level 1).
 */
export const authorizeRoleLevelForDelete = async (req, res, next) => {
  try {
    if (req.context?.isSuperAdmin) return next();

    const roleIds  = req.context?.roleIds || [];
    const targetId = req.params.id;

    if (!targetId) {
      return res.status(400).json({ success: false, message: "Role ID is required" });
    }

    const Role = getRoleModel();

    // Resolve both in parallel
    const [userRoles, targetRole] = await Promise.all([
      Role.find({ _id: { $in: roleIds } }).lean(),
      Role.findById(targetId).lean(),
    ]);

    if (!targetRole) {
      return res.status(404).json({ success: false, message: "Target role not found" });
    }

    // Block deletion of any system role regardless of level
    if (targetRole.isSystem) {
      return res.status(403).json({
        success: false,
        message: "System roles cannot be deleted",
      });
    }

    const userEffectiveLevel = Math.min(...userRoles.map((r) => r.level ?? 100));
    const targetLevel        = targetRole.level ?? 100;

    if (targetLevel <= userEffectiveLevel) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: You (level ${userEffectiveLevel}) cannot delete a role at level ${targetLevel}.`,
      });
    }

    next();
  } catch (err) {
    console.error("Role Hierarchy Delete Guard Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal error during role deletion authorization",
    });
  }
};

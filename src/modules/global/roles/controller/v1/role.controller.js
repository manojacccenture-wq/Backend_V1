import { getRoleModel, CATEGORY_LEVEL_MAP } from "../../models/roles.models.js";
import { asyncHandler } from "../../../../../shared/utils/asyncHandler/asyncHandler.js";
import { attachTemplatePolicy } from "../../../../../modules/iam/services/policyTemplates.service.js";

/**
 * Controller for Role Management (Tenant Aware)
 *
 * Security layers applied:
 *  Phase 1 — authorizePolicy("roles:create")   on the route
 *  Phase 2 — authorizeRoleLevel                on the route (hierarchy guard)
 *  Phase 3 — attachTemplatePolicy              called here after creation
 */

// ─── CREATE ──────────────────────────────────────────────────────────────────
export const createRole = asyncHandler(async (req, res) => {
  const { name, code, isSystem, category = "CUSTOM" } = req.body;
  const tenantId = req.context?.tenantId || null;

  // 🛡️ Tenants cannot create isSystem roles — only Super Admins can
  if (isSystem && !req.context?.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: "Access Denied: Only Super Admins can create system roles",
    });
  }

  const Role = getRoleModel();

  // 🛡️ Duplicate code guard (compound index catches DB-level, this is a clean user-facing error)
  const existingRole = await Role.findOne({
    code: code.toUpperCase(),
    tenantId,
  });

  if (existingRole) {
    return res.status(400).json({
      success: false,
      message: `The role code '${code.toUpperCase()}' is already in use for this tenant. Please use a different code.`,
    });
  }

  // Phase 2: Resolve level — use the category default if caller does not supply one
  const level = parseInt(req.body.level) || CATEGORY_LEVEL_MAP[category] || 100;

  const role = await Role.create({
    name,
    code: code.toUpperCase(),
    isSystem: isSystem || false,
    tenantId,
    category,
    level,
  });

  // Phase 3: Auto-attach sealed policy template based on category
  // Runs in background — failure should NOT break role creation
  try {
    await attachTemplatePolicy(role._id, category, tenantId, name);
  } catch (templateErr) {
    // Log but do NOT fail the request — role is created, policy can be attached manually
    console.warn(`[IAM] Policy template attachment failed for role '${name}':`, templateErr.message);
  }

  res.status(201).json({
    success: true,
    message: "Role created successfully",
    data: role,
  });
});

// ─── READ ─────────────────────────────────────────────────────────────────────
export const getRoles = asyncHandler(async (req, res) => {
  const Role     = getRoleModel();
  const tenantId = req.context?.tenantId || null;

  // Return both global system roles AND this tenant's custom roles
  const roles = await Role.find({
    $or: [
      { tenantId: null },
      { tenantId: tenantId },
    ],
  })
    .sort({ level: 1 }) // Sort by authority — most powerful first
    .lean();

  res.status(200).json({
    success: true,
    data: roles,
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteRole = asyncHandler(async (req, res) => {
  const { id }   = req.params;
  const tenantId = req.context?.tenantId || null;
  const Role     = getRoleModel();

  // Phase 2 hierarchy guard runs BEFORE this on the route level.
  // This is the final ownership guard.
  const query = { _id: id };
  if (!req.context.isSuperAdmin) {
    query.tenantId = tenantId; // Tenants can only delete their OWN roles
  }

  const role = await Role.findOneAndDelete(query);

  if (!role) {
    return res.status(404).json({
      success: false,
      message: "Role not found or you don't have permission to delete it",
    });
  }

  res.status(200).json({
    success: true,
    message: "Role deleted successfully",
  });
});

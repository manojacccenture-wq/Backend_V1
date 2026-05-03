import { getRoleModel } from "../../models/roles.models.js";
import { asyncHandler } from "../../../../../shared/utils/asyncHandler/asyncHandler.js";

/**
 * Controller for Role Management (Tenant Aware)
 */

export const createRole = asyncHandler(async (req, res) => {
  const { name, code, isSystem } = req.body;
  console.log("name", name)
  console.log("code", code)
  const tenantId = req.context?.tenantId || null; // 🔥 Resolve tenant from IAM context
  console.log("tenantId", tenantId)
  console.log("isSystem", isSystem)

  const Role = getRoleModel();
  
  // 🛡️ Check if this role code already exists for this tenant
  const existingRole = await Role.findOne({ 
    code: code.toUpperCase(), 
    tenantId 
  });

  if (existingRole) {
    return res.status(400).json({
      success: false,
      message: `The role code '${code.toUpperCase()}' is already in use for this tenant. Please use a different code.`
    });
  }

  const role = await Role.create({
    name,
    code: code.toUpperCase(),
    isSystem: isSystem || false,
    tenantId, // Link role to the creating tenant
  });

  res.status(201).json({
    success: true,
    message: "Role created successfully",
    data: role
  });
});

export const getRoles = asyncHandler(async (req, res) => {
  const Role = getRoleModel();
  const tenantId = req.context?.tenantId || null;

  // 🔥 MULTI-TENANT ISOLATION
  // We only show roles that are either:
  // 1. Global System Roles (tenantId: null)
  // 2. Custom Roles created by the current active tenant
  const roles = await Role.find({
    $or: [
      { tenantId: null },
      { tenantId: tenantId }
    ]
  }).lean();

  res.status(200).json({
    success: true,
    data: roles
  });
});

export const deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.context?.tenantId || null;
  const Role = getRoleModel();

  // Ensure we only delete roles belonging to this tenant (unless super admin)
  const query = { _id: id };
  if (!req.context.isSuperAdmin) {
    query.tenantId = tenantId;
  }

  const role = await Role.findOneAndDelete(query);

  if (!role) {
    return res.status(404).json({
      success: false,
      message: "Role not found or you don't have permission to delete it"
    });
  }

  res.status(200).json({
    success: true,
    message: "Role deleted successfully"
  });
});

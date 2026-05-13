import { asyncHandler } from "../../../../shared/utils/asyncHandler/asyncHandler.js";
import {
  getBusinessRoles,
  getBusinessRoleById,
  createBusinessRole,
  updateBusinessRole,
  deleteBusinessRole,
  assignBusinessRoleToMembership,
} from "../../services/businessRole.service.js";
import { getCapabilityModel } from "../../models/capability.model.js";

// ─── BUSINESS ROLES ───────────────────────────────────────────────────────────

export const listBusinessRoles = asyncHandler(async (req, res) => {
  const tenantId = req.context?.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: "Tenant context required" });

  const roles = await getBusinessRoles(tenantId);
  res.json({ success: true, data: roles });
});

export const getOneBusinessRole = asyncHandler(async (req, res) => {
  const tenantId = req.context?.tenantId;
  const role = await getBusinessRoleById(req.params.id, tenantId);
  res.json({ success: true, data: role });
});

export const createBusinessRoleController = asyncHandler(async (req, res) => {
  const tenantId  = req.context?.tenantId;
  const createdBy = req.user?.userId;
  const { name, description, capabilities } = req.body;

  if (!name) return res.status(400).json({ success: false, message: "Role name is required" });

  const role = await createBusinessRole({ tenantId, name, description, capabilities, createdBy });
  res.status(201).json({ success: true, data: role });
});

export const updateBusinessRoleController = asyncHandler(async (req, res) => {
  const tenantId = req.context?.tenantId;
  const { name, description, capabilities } = req.body;

  const role = await updateBusinessRole(req.params.id, tenantId, { name, description, capabilities });
  res.json({ success: true, data: role });
});

export const deleteBusinessRoleController = asyncHandler(async (req, res) => {
  const tenantId = req.context?.tenantId;
  await deleteBusinessRole(req.params.id, tenantId);
  res.json({ success: true, message: "Business role deleted" });
});

// ─── CAPABILITY REGISTRY ──────────────────────────────────────────────────────

export const listCapabilities = asyncHandler(async (req, res) => {
  const Capability = getCapabilityModel();
  const capabilities = await Capability.find({}).sort({ group: 1, key: 1 }).lean();
  res.json({ success: true, data: capabilities });
});

// ─── MEMBERSHIP ASSIGNMENT ────────────────────────────────────────────────────

export const assignBusinessRole = asyncHandler(async (req, res) => {
  const tenantId      = req.context?.tenantId;
  const { membershipId } = req.params;
  const { businessRoleId } = req.body; // can be null to unassign

  const membership = await assignBusinessRoleToMembership(membershipId, businessRoleId, tenantId);
  res.json({ success: true, data: membership });
});

import mongoose from "mongoose";
import { getBusinessRoleModel } from "../models/businessRole.model.js";
import { getMembershipModel } from "../../global/membership/models/membership.model.js";
import { PRESET_BUSINESS_ROLES } from "../constants/capabilities.constants.js";

// ─── SEED PRESETS ─────────────────────────────────────────────────────────────

/**
 * Idempotently creates preset business roles for a new tenant.
 * Called inside createTenantWithAdmin — OUTSIDE the MongoDB transaction
 * because session conflict risk outweighs the benefit here.
 */
export const seedPresetBusinessRoles = async (tenantId, createdBy = null) => {
  const BusinessRole = getBusinessRoleModel();

  const ops = PRESET_BUSINESS_ROLES.map((preset) => ({
    updateOne: {
      filter: { tenantId, name: preset.name },
      update: { $setOnInsert: { ...preset, tenantId, createdBy } },
      upsert: true,
    },
  }));

  await BusinessRole.bulkWrite(ops, { ordered: false });
};

// ─── LIST ─────────────────────────────────────────────────────────────────────

/**
 * Returns all business roles for a tenant with member count via aggregation.
 * Self-heals: if a tenant has no roles yet (e.g. created before this system),
 * preset roles are provisioned on first access — no manual migration needed.
 */
export const getBusinessRoles = async (tenantId) => {
  const BusinessRole = getBusinessRoleModel();
  const tenantObjId = new mongoose.Types.ObjectId(tenantId);

  // ── Self-healing auto-provision ───────────────────────────────────────────
  // Existing tenants have no business roles. Seed presets silently on first load.
  const existingCount = await BusinessRole.countDocuments({ tenantId: tenantObjId });
  if (existingCount === 0) {
    await seedPresetBusinessRoles(tenantId);
  }

  return BusinessRole.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
    {
      $lookup: {
        from: "memberships",
        let: { roleId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [
            { $eq: ["$businessRoleId", "$$roleId"] },
            { $eq: ["$isActive", true] },
          ]}}},
          { $count: "total" },
        ],
        as: "memberCount",
      },
    },
    {
      $addFields: {
        memberCount: { $ifNull: [{ $arrayElemAt: ["$memberCount.total", 0] }, 0] },
        capabilityCount: { $size: "$capabilities" },
      },
    },
    { $project: { __v: 0 } },
    { $sort: { isPreset: -1, name: 1 } }, // presets first, then alphabetical
  ]);
};

// ─── GET ONE ──────────────────────────────────────────────────────────────────

export const getBusinessRoleById = async (id, tenantId) => {
  const BusinessRole = getBusinessRoleModel();
  const role = await BusinessRole.findOne({
    _id: id,
    tenantId: new mongoose.Types.ObjectId(tenantId),
  }).lean();
  if (!role) throw new Error("Business role not found");
  return role;
};

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const createBusinessRole = async ({ tenantId, name, description, capabilities, createdBy }) => {
  const BusinessRole = getBusinessRoleModel();
  return BusinessRole.create({ tenantId, name, description: description || "", capabilities: capabilities || [], createdBy, isPreset: false });
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const updateBusinessRole = async (id, tenantId, { name, description, capabilities }) => {
  const BusinessRole = getBusinessRoleModel();
  const role = await BusinessRole.findOneAndUpdate(
    { _id: id, tenantId: new mongoose.Types.ObjectId(tenantId) },
    { $set: { name, description, capabilities } },
    { new: true, runValidators: true }
  ).lean();
  if (!role) throw new Error("Business role not found or unauthorized");
  return role;
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const deleteBusinessRole = async (id, tenantId) => {
  const BusinessRole = getBusinessRoleModel();
  const Membership   = getMembershipModel();

  const role = await BusinessRole.findOne({
    _id: id,
    tenantId: new mongoose.Types.ObjectId(tenantId),
  }).lean();

  if (!role) throw new Error("Business role not found");

  // Null out any memberships pointing to this role before deletion
  await Membership.updateMany({ businessRoleId: id }, { $set: { businessRoleId: null } });

  await BusinessRole.deleteOne({ _id: id });
  return role;
};

// ─── CAPABILITY CHECK (for requireCapability middleware) ──────────────────────

export const checkCapability = async (userId, tenantId, capabilityKey) => {
  const Membership = getMembershipModel();
  const membership = await Membership.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
    isActive: true,
    businessRoleId: { $ne: null },
  })
    .populate({ path: "businessRoleId", select: "capabilities" })
    .lean();

  return membership?.businessRoleId?.capabilities?.includes(capabilityKey) ?? false;
};

// ─── ASSIGN BUSINESS ROLE TO MEMBERSHIP ──────────────────────────────────────

export const assignBusinessRoleToMembership = async (membershipId, businessRoleId, tenantId) => {
  const Membership   = getMembershipModel();
  const BusinessRole = getBusinessRoleModel();

  // Validate business role belongs to this tenant
  if (businessRoleId) {
    const role = await BusinessRole.findOne({
      _id: businessRoleId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).lean();
    if (!role) throw new Error("Business role not found for this tenant");
  }

  const membership = await Membership.findOneAndUpdate(
    { _id: membershipId, tenantId: new mongoose.Types.ObjectId(tenantId) },
    { $set: { businessRoleId: businessRoleId || null } },
    { new: true }
  ).lean();

  if (!membership) throw new Error("Membership not found");
  return membership;
};

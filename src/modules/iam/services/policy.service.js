import mongoose from "mongoose";
import { getPolicyModel } from "../models/policy.model.js";
import { getRolePolicyModel } from "../models/rolePolicy.model.js";
import { getMembershipModel } from "../../global/membership/models/membership.model.js";

/**
 * Evaluates access based on policies attached to the provided roleIds.
 * @param {Array<string|mongoose.Types.ObjectId>} roleIds 
 * @param {string} requestedAction - e.g., 'orders:create'
 * @param {string} requestedResource - e.g., '*' or 'order_123'
 * @returns {Promise<boolean>}
 */
export const evaluateAccess = async (roleIds, requestedAction, requestedResource) => {
  if (!roleIds || roleIds.length === 0) return false;

  const Policy = getPolicyModel();
  const RolePolicy = getRolePolicyModel();

  // 1. Get all policy IDs associated with these roles
  const rolePolicies = await RolePolicy.find({
    roleId: { $in: roleIds.map(id => new mongoose.Types.ObjectId(id)) }
  }).lean();

  const policyIds = rolePolicies.map(rp => rp.policyId);

  if (policyIds.length === 0) {
    return false; // No policies attached, default deny
  }

  // 2. Fetch all statements from these policies
  const policies = await Policy.find({
    _id: { $in: policyIds }
  }).lean();

  let isAllowed = false;

  for (const policy of policies) {
    for (const statement of policy.statements) {
      const actionMatches = statement.actions.some(pattern => matchPattern(pattern, requestedAction));
      const resourceMatches = statement.resources.some(pattern => matchPattern(pattern, requestedResource));

      if (actionMatches && resourceMatches) {
        if (statement.effect === "DENY") {
          return false; // Explicit DENY overrides everything (IAM behavior)
        }
        if (statement.effect === "ALLOW") {
          isAllowed = true;
        }
      }
    }
  }

  return isAllowed;
};

/**
 * Matches action/resource strings, supporting wildcards (*)
 */
const matchPattern = (pattern, value) => {
  if (pattern === "*") return true;
  if (pattern === value) return true;
  
  // AWS-style wildcard matching: 'orders:*' matches 'orders:create'
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexPattern = "^" + escaped.split("*").join(".*") + "$";
  const regex = new RegExp(regexPattern);
  
  return regex.test(value);
};

/**
 * Creates a new Policy (Managed or Inline)
 */
export const createPolicy = async (policyData) => {
  const Policy = getPolicyModel();
  return await Policy.create(policyData);
};

/**
 * Attaches a policy to a role
 */
export const attachPolicyToRole = async (roleId, policyId) => {
  const RolePolicy = getRolePolicyModel();
  return await RolePolicy.findOneAndUpdate(
    { roleId, policyId },
    { roleId, policyId },
    { upsert: true, new: true }
  );
};

/**
 * Helper to get all role IDs for a user in a specific context (tenant)
 */
export const getUserRoleIds = async (userId, tenantId = null) => {
  const Membership = getMembershipModel();
  const query = { userId, isActive: true };
  
  if (tenantId) {
    query.tenantId = new mongoose.Types.ObjectId(tenantId);
  } else {
    query.tenantId = null; // Global/System roles
  }

  const memberships = await Membership.find(query).lean();
  return memberships.map(m => m.roleId);
};

/**
 * Compiles all ALLOWED actions for the given roleIds, subtracting any DENIED actions.
 * Used for legacy req.user.permissions support.
 */
export const getCompiledPermissions = async (roleIds) => {
  if (!roleIds || roleIds.length === 0) return [];

  const Policy = getPolicyModel();
  const RolePolicy = getRolePolicyModel();

  const rolePolicies = await RolePolicy.find({
    roleId: { $in: roleIds.map(id => new mongoose.Types.ObjectId(id)) }
  }).lean();

  const policyIds = rolePolicies.map(rp => rp.policyId);
  if (policyIds.length === 0) return [];

  const policies = await Policy.find({ _id: { $in: policyIds } }).lean();

  let allowActions = new Set();
  let denyActions = new Set();

  for (const policy of policies) {
    for (const statement of policy.statements) {
      if (statement.effect === "ALLOW") {
        statement.actions.forEach(a => allowActions.add(a));
      } else {
        statement.actions.forEach(a => denyActions.add(a));
      }
    }
  }

  // Simple filter for exact matches. 
  // In a real IAM system, DENY would be checked per request via evaluateAccess.
  return Array.from(allowActions).filter(action => !denyActions.has(action));
};

/**
 * Get all available policies (Tenant Aware)
 */
export const getPolicies = async (tenantId = null) => {
  const Policy = getPolicyModel();
  
  // Show Global Managed policies + Tenant specific policies
  return await Policy.find({
    $or: [
      { tenantId: null },
      { tenantId: tenantId }
    ]
  }).lean();
};

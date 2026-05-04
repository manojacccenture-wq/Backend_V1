/**
 * IAM Policy Auto-Assignment Templates (Phase 3 — Strategy 5)
 *
 * When a tenant creates a role, these templates are AUTOMATICALLY attached
 * based on the role's category. The tenant picks the CATEGORY, not the actions.
 * This means even a custom role with code "SUPREME_BOSS" will only ever get
 * STAFF-level permissions if its category is "STAFF".
 *
 * Action format: "resource:verb"  (e.g., "orders:create", "roles:read")
 * Wildcard:       "*"             (matches any resource or verb)
 */

import { getPolicyModel } from "../models/policy.model.js";
import { getRolePolicyModel } from "../models/rolePolicy.model.js";

// ─── Template Definitions ─────────────────────────────────────────────────────

export const POLICY_TEMPLATES = {

  ADMIN: {
    description: "Full tenant administrative access",
    statements: [
      {
        effect: "ALLOW",
        actions: ["*"],           // Everything allowed
        resources: ["*"],
      },
    ],
  },

  MANAGER: {
    description: "Operational management access",
    statements: [
      {
        effect: "ALLOW",
        actions: [
          "orders:*",
          "users:read",
          "roles:read",
          "crm:*",
          "reports:read",
        ],
        resources: ["*"],
      },
      {
        // Managers cannot create/delete roles or policies — explicitly DENY
        effect: "DENY",
        actions: ["roles:create", "roles:delete", "policies:create", "policies:delete"],
        resources: ["*"],
      },
    ],
  },

  STAFF: {
    description: "Standard operational staff access",
    statements: [
      {
        effect: "ALLOW",
        actions: [
          "orders:read",
          "orders:create",
          "orders:update",
          "crm:read",
        ],
        resources: ["*"],
      },
      {
        // Staff can never touch users, roles, or policies
        effect: "DENY",
        actions: ["users:*", "roles:*", "policies:*"],
        resources: ["*"],
      },
    ],
  },

  VIEWER: {
    description: "Read-only access across all resources",
    statements: [
      {
        effect: "ALLOW",
        actions: ["*:read"],       // Only read actions via wildcard
        resources: ["*"],
      },
      {
        effect: "DENY",
        actions: ["*:create", "*:update", "*:delete"],
        resources: ["*"],
      },
    ],
  },

  // CUSTOM — no template, tenant manually attaches policies
  CUSTOM: null,
};


// ─── Auto-Attach Logic ────────────────────────────────────────────────────────

/**
 * After a role is created, this function auto-creates and attaches the
 * sealed policy template based on the role's category.
 *
 * @param {string} roleId     - The newly created role's _id
 * @param {string} category   - The role's category (ADMIN|MANAGER|STAFF|VIEWER|CUSTOM)
 * @param {string|null} tenantId - The tenant that owns this role
 * @param {string} roleName   - Used for policy naming
 */
export const attachTemplatePolicy = async (roleId, category, tenantId, roleName) => {
  const template = POLICY_TEMPLATES[category];

  // CUSTOM roles have no template — tenant manages policies manually
  if (!template) return null;

  const Policy    = getPolicyModel();
  const RolePolicy = getRolePolicyModel();

  // Create a sealed INLINE policy scoped to this tenant
  const policy = await Policy.create({
    name: `[AUTO] ${roleName} — ${category} Template`,
    type: "INLINE",
    tenantId: tenantId || null,
    statements: template.statements,
  });

  // Attach to the new role
  await RolePolicy.findOneAndUpdate(
    { roleId, policyId: policy._id },
    { roleId, policyId: policy._id },
    { upsert: true, new: true }
  );

  return policy;
};

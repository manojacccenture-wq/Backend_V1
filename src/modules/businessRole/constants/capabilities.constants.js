/**
 * CAPABILITY_REGISTRY — single source of truth for all capability keys.
 * Seeded into the Capability collection at boot.
 * Grouped by functional area for the frontend checkbox matrix.
 */
export const CAPABILITY_REGISTRY = [
  // ── Dashboard ───────────────────────────────────────────────────────────────
  { key: "dashboard.view", label: "View Dashboard", group: "Dashboard", description: "Can view the main dashboard overview", isDefault: true },

  // ── User Management ─────────────────────────────────────────────────────────
  { key: "users.view",   label: "View Users",   group: "User Management", description: "Can see the list of workspace members", isDefault: true  },
  { key: "users.create", label: "Create Users", group: "User Management", description: "Can invite new members to the workspace", isDefault: false },
  { key: "users.edit",   label: "Edit Users",   group: "User Management", description: "Can update member details and roles", isDefault: false },
  { key: "users.delete", label: "Delete Users", group: "User Management", description: "Can remove members from the workspace", isDefault: false },
  { key: "users.reset_mfa", label: "Reset User MFA", group: "User Management", description: "Can reset Two-Factor Authentication for members", isDefault: false },

  // ── IAM Role Management ──────────────────────────────────────────────────────
  { key: "roles.view",   label: "View IAM Roles",   group: "IAM Role Management", description: "Can view system IAM roles", isDefault: false  },
  { key: "roles.create", label: "Create IAM Roles", group: "IAM Role Management", description: "Can create system IAM roles", isDefault: false },
  { key: "roles.edit",   label: "Edit IAM Roles",   group: "IAM Role Management", description: "Can update system IAM roles", isDefault: false },
  { key: "roles.delete", label: "Delete IAM Roles", group: "IAM Role Management", description: "Can delete system IAM roles", isDefault: false },

  // ── IAM Policy Management ────────────────────────────────────────────────────
  { key: "policy.view",   label: "View Policies",   group: "IAM Policy Management", description: "Can view system policies", isDefault: false  },
  { key: "policy.create", label: "Create Policies", group: "IAM Policy Management", description: "Can create system policies", isDefault: false },
  { key: "policy.edit",   label: "Edit Policies",   group: "IAM Policy Management", description: "Can update system policies", isDefault: false },
  { key: "policy.delete", label: "Delete Policies", group: "IAM Policy Management", description: "Can delete system policies", isDefault: false },

  // ── Business Role Management ─────────────────────────────────────────────────
  { key: "business-roles.view",   label: "View Business Roles",   group: "Business Role Management", description: "Can view business roles", isDefault: true  },
  { key: "business-roles.create", label: "Create Business Roles", group: "Business Role Management", description: "Can create business roles", isDefault: false },
  { key: "business-roles.edit",   label: "Edit Business Roles",   group: "Business Role Management", description: "Can update business roles", isDefault: false },
  { key: "business-roles.delete", label: "Delete Business Roles", group: "Business Role Management", description: "Can delete business roles", isDefault: false },

  // ── Billing ──────────────────────────────────────────────────────────────────
  { key: "billing.view",   label: "View Billing",   group: "Billing", description: "Can view subscription and billing info", isDefault: false },
  { key: "billing.manage", label: "Manage Billing", group: "Billing", description: "Can change plans and billing settings",  isDefault: false },
  { key: "plans.view",     label: "View Plans",     group: "Billing", description: "Can view available plans", isDefault: false },
  { key: "subscription.manage", label: "Manage Subscription", group: "Billing", description: "Can manage subscriptions", isDefault: false },

  // ── Super Admin ──────────────────────────────────────────────────────────────
  { key: "tenants.view",   label: "View Tenants",   group: "Super Admin", description: "Can view all tenants", isDefault: false },
  { key: "tenants.create", label: "Create Tenants", group: "Super Admin", description: "Can create new tenants", isDefault: false },
  { key: "tenants.edit",   label: "Edit Tenants",   group: "Super Admin", description: "Can edit tenants", isDefault: false },
  { key: "plans.manage",   label: "Manage Plans",   group: "Super Admin", description: "Can create and edit platform plans", isDefault: false },
  { key: "demo-requests.view", label: "View Demo Requests", group: "Super Admin", description: "Can view incoming demo requests", isDefault: false },

  // ── Operations / Orders ──────────────────────────────────────────────────────
  { key: "orders.view",   label: "View Orders",   group: "Operations", description: "Can view all orders in the workspace", isDefault: true  },
  { key: "orders.create", label: "Create Orders", group: "Operations", description: "Can place new orders",                  isDefault: true  },
  { key: "orders.edit",   label: "Edit Orders",   group: "Operations", description: "Can modify existing orders",           isDefault: false },
  { key: "orders.delete", label: "Delete Orders", group: "Operations", description: "Can cancel or delete orders",          isDefault: false },

  // ── Reports ──────────────────────────────────────────────────────────────────
  { key: "reports.view", label: "View Reports", group: "Reports", description: "Can view reports and analytics", isDefault: true },
];

/**
 * Preset role definitions — seeded per-tenant at tenant creation.
 * Keys must match CAPABILITY_REGISTRY entries.
 */
export const PRESET_BUSINESS_ROLES = [
  {
    name: "Tenant Admin",
    description: "Full management of a single tenant workspace",
    isPreset: true,
    capabilities: [
      "dashboard.view",
      "users.view", "users.create", "users.edit", "users.delete", "users.reset_mfa",
      "roles.view", "roles.create", "roles.edit", "roles.delete",
      "policy.view", "policy.create", "policy.edit", "policy.delete",
      "business-roles.view", "business-roles.create", "business-roles.edit", "business-roles.delete",
      "billing.view", "billing.manage", "plans.view", "subscription.manage",
    ],
  },
  {
    name: "Admin",
    description: "Full access to all workspace features",
    isPreset: true,
    capabilities: CAPABILITY_REGISTRY.map((c) => c.key), // ALL
  },
  {
    name: "Manager",
    description: "Operational management access",
    isPreset: true,
    capabilities: [
      "dashboard.view",
      "users.view",
      "billing.view",
      "business-roles.view",
    ],
  },
  {
    name: "Staff",
    description: "Day-to-day operational access",
    isPreset: true,
    capabilities: [
      "dashboard.view",
      "orders.view", "orders.create", "orders.edit",
      "reports.view",
    ],
  },
  {
    name: "Viewer",
    description: "Read-only access to workspace data",
    isPreset: true,
    capabilities: [
      "dashboard.view",
      "users.view",
      "billing.view",
    ],
  },
  {
    name: "Billing Admin",
    description: "Access to billing and subscription management",
    isPreset: true,
    capabilities: [
      "billing.view", "billing.manage", "plans.view", "subscription.manage", "users.view",
    ],
  },
];

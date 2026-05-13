/**
 * CAPABILITY_REGISTRY — single source of truth for all capability keys.
 * Seeded into the Capability collection at boot.
 * Grouped by functional area for the frontend checkbox matrix.
 */
export const CAPABILITY_REGISTRY = [
  // ── User Management ─────────────────────────────────────────────────────────
  { key: "users.view",   label: "View Users",   group: "User Management", description: "Can see the list of workspace members", isDefault: true  },
  { key: "users.create", label: "Create Users", group: "User Management", description: "Can invite new members to the workspace", isDefault: false },
  { key: "users.edit",   label: "Edit Users",   group: "User Management", description: "Can update member details and roles", isDefault: false },
  { key: "users.delete", label: "Delete Users", group: "User Management", description: "Can remove members from the workspace", isDefault: false },

  // ── Role Management ──────────────────────────────────────────────────────────
  { key: "roles.view",   label: "View Roles",   group: "Role Management", description: "Can view business roles and their permissions", isDefault: true  },
  { key: "roles.manage", label: "Manage Roles", group: "Role Management", description: "Can create, edit, and delete business roles", isDefault: false },

  // ── Operations / Orders ──────────────────────────────────────────────────────
  { key: "orders.view",   label: "View Orders",   group: "Operations", description: "Can view all orders in the workspace", isDefault: true  },
  { key: "orders.create", label: "Create Orders", group: "Operations", description: "Can place new orders",                  isDefault: true  },
  { key: "orders.edit",   label: "Edit Orders",   group: "Operations", description: "Can modify existing orders",           isDefault: false },
  { key: "orders.delete", label: "Delete Orders", group: "Operations", description: "Can cancel or delete orders",          isDefault: false },

  // ── Billing ──────────────────────────────────────────────────────────────────
  { key: "billing.view",   label: "View Billing",   group: "Billing", description: "Can view subscription and billing info", isDefault: false },
  { key: "billing.manage", label: "Manage Billing", group: "Billing", description: "Can change plans and billing settings",  isDefault: false },

  // ── Reports ──────────────────────────────────────────────────────────────────
  { key: "reports.view", label: "View Reports", group: "Reports", description: "Can view reports and analytics", isDefault: true },

  // ── Inventory ────────────────────────────────────────────────────────────────
  { key: "inventory.view",   label: "View Inventory",   group: "Inventory", description: "Can view inventory and stock levels", isDefault: true  },
  { key: "inventory.manage", label: "Manage Inventory", group: "Inventory", description: "Can update stock and manage items",   isDefault: false },
];

/**
 * Preset role definitions — seeded per-tenant at tenant creation.
 * Keys must match CAPABILITY_REGISTRY entries.
 */
export const PRESET_BUSINESS_ROLES = [
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
      "users.view", "users.create", "users.edit",
      "roles.view",
      "orders.view", "orders.create", "orders.edit", "orders.delete",
      "reports.view",
      "inventory.view", "inventory.manage",
    ],
  },
  {
    name: "Staff",
    description: "Day-to-day operational access",
    isPreset: true,
    capabilities: [
      "orders.view", "orders.create", "orders.edit",
      "inventory.view",
      "reports.view",
    ],
  },
  {
    name: "Viewer",
    description: "Read-only access to workspace data",
    isPreset: true,
    capabilities: [
      "users.view", "roles.view", "orders.view",
      "billing.view", "reports.view", "inventory.view",
    ],
  },
  {
    name: "Billing Admin",
    description: "Access to billing and subscription management",
    isPreset: true,
    capabilities: [
      "billing.view", "billing.manage", "reports.view", "users.view",
    ],
  },
];

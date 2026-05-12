/**
 * Master Menu Registry — Single Source of Truth
 *
 * Central definition of all sidebar menu items across the platform.
 * Each item can specify:
 *   - requiredAction: IAM action string needed to see this item (null = always visible)
 *   - product:        Product code required (only for product-specific features)
 *   - children:       Nested sub-items (filtered independently)
 *
 * The backend filters this registry per-user based on their compiled
 * permissions and assigned products, then sends the filtered result
 * to the frontend. The frontend renders it as-is — zero security logic.
 *
 * ─── HOW TO ADD NEW MENU ITEMS ────────────────────────────────────────────
 * 1. For a new GLOBAL item:    Add to SUPER_ADMIN_MENU
 * 2. For a new TENANT item:    Add to TENANT_BASE_MENU
 * 3. For a new PRODUCT feature: Add to PRODUCT_MENUS[<PRODUCT_CODE>]
 * ──────────────────────────────────────────────────────────────────────────
 */

// ─── SUPER ADMIN MENU (Global Platform) ─────────────────────────────────────
export const SUPER_ADMIN_MENU = [
  { id: "dashboard", label: "Overview", path: "", requiredAction: null },
  { id: "tenants", label: "Tenants", path: "/tenants", requiredAction: "tenants:read" },
  { id: "logout", label: "Logout", path: "/logout", requiredAction: null },
];


export const TENANT_BASE_MENU = [
  { id: "dashboard", label: "Overview", path: "", requiredAction: null },
  { id: "billing", label: "Billing", path: "/billing", requiredAction: null },
  { id: "logout", label: "Logout", path: "/logout", requiredAction: null },
];
// ─── TENANT BASE MENU (Common across all tenant users) ──────────────────────
// export const TENANT_BASE_MENU = [
//   { id: "dashboard", label: "Overview", path: "", requiredAction: null },
//   {
//     id: "users",
//     label: "User Management",
//     children: [
//       { id: "users", label: "Users", path: "/users", requiredAction: "users:read" },
//       { id: "roles", label: "Roles", path: "/roles", requiredAction: "roles:read" },
//       { id: "policy", label: "Policy Management", path: "/policy", requiredAction: "policies:read" },
//     ],
//   },
//   { id: "logout", label: "Logout", path: "/logout", requiredAction: null },
// ];

// ─── PRODUCT-SPECIFIC MENUS ─────────────────────────────────────────────────
// Keys MUST match Product.code in the database.
// These items are injected into the tenant menu when the user has the product.
export const PRODUCT_MENUS = {
  ANAS_KITCHEN: [
    // We removed the parent wrapper. Just define the flat features here.
    // The path should include the product code so frontend navigation works
    { id: "orders", label: "Orders", path: "/ANAS_KITCHEN/orders", requiredAction: "orders:read" },
    {
      id: "users",
      label: "User Management",
      children: [
        { id: "users", label: "Users", path: "/users", requiredAction: "users:read" },
        { id: "roles", label: "Roles", path: "/roles", requiredAction: "roles:read" },
        { id: "policy", label: "Policy Management", path: "/policy", requiredAction: "policies:read" },
      ],
    },

    { id: "tables", label: "Tables", path: "/ANAS_KITCHEN/tables", requiredAction: "tables:read" },
  ],
  // ─── Future Products ────────────────────────────────────────────────────
  // CRM: [
  //   { id: "contacts", label: "Contacts", path: "/contacts", requiredAction: "crm:read" },
  //   { id: "deals", label: "Deals", path: "/deals", requiredAction: "crm:read" },
  // ],
};

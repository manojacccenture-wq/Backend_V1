import {
  SUPER_ADMIN_MENU,
  TENANT_BASE_MENU,
  PRODUCT_MENUS,
} from "../../../shared/config/menuRegistry.js";

/**
 * Build User Menu Service
 *
 * Filters the master menu registry based on the user's compiled
 * IAM permissions and assigned products. Returns only the items
 * the user is authorized to see.
 *
 * This runs server-side — the frontend receives a pre-filtered
 * menu and renders it as-is with zero security logic.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Matches an IAM permission string against a required action.
 * Supports wildcard patterns (e.g., "orders:*" matches "orders:read").
 */
const matchAction = (permission, requiredAction) => {
  if (permission === "*") return true;
  if (permission === requiredAction) return true;

  const escaped = permission.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regexPattern = "^" + escaped.split("*").join(".*") + "$";
  return new RegExp(regexPattern).test(requiredAction);
};

/**
 * Checks if the user's compiled permissions include the required action.
 * Returns true if requiredAction is null (public/always-visible item).
 */
const hasPermission = (permissions, requiredAction) => {
  if (!requiredAction) return true;
  return permissions.some((p) => matchAction(p, requiredAction));
};

/**
 * Strips internal fields (requiredAction, product) from a menu item
 * before sending to frontend — the client should never see these.
 */
const stripInternals = ({ requiredAction, product, children, ...clean }) => {
  if (children) {
    clean.children = children.map(stripInternals);
  }
  return clean;
};

/**
 * Recursively filters menu items based on the user's permissions.
 * For parent items with children, includes the parent only if at
 * least one child passes the permission check.
 */
const filterMenuItems = (items, permissions) => {
  return items.reduce((acc, item) => {
    if (item.children) {
      const filteredChildren = item.children.filter((child) =>
        hasPermission(permissions, child.requiredAction)
      );
      if (filteredChildren.length > 0) {
        acc.push(stripInternals({ ...item, children: filteredChildren }));
      }
    } else {
      if (hasPermission(permissions, item.requiredAction)) {
        acc.push(stripInternals(item));
      }
    }
    return acc;
  }, []);
};

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Builds the complete filtered menu for a user.
 *
 * @param {string[]} permissions  - Compiled permission actions (e.g., ["orders:*", "users:read"])
 * @param {Array<{code: string}>} products - User's assigned products
 * @param {boolean} isSuperAdmin  - Whether the user is operating in global context
 * @returns {Array} Filtered menu items ready for frontend rendering
 */
export const buildUserMenu = (
  permissions = [],
  products = [],
  isSuperAdmin = false,
  activeProductCode = null
) => {
  // ─── Super Admin: use global menu ─────────────────────────────────────
  if (isSuperAdmin) {
    return filterMenuItems(SUPER_ADMIN_MENU, permissions);
  }

  // ─── Tenant User: base menu + product overlays ────────────────────────
  const menu = JSON.parse(JSON.stringify(TENANT_BASE_MENU)); // Deep clone
  const logoutIndex = menu.findIndex((m) => m.id === "logout");

  // Inject active product features directly into the base menu (no parent wrapper)
  if (activeProductCode) {
    const normalizedProductCode = activeProductCode.toUpperCase();
  
    
    // Verify user actually has access to this product
    const hasProduct = products.some((p) => p.code.toUpperCase() === normalizedProductCode);
    
    if (hasProduct) {
      const productFeatures = PRODUCT_MENUS[normalizedProductCode];
      
      if (productFeatures) {
        const filteredFeatures = filterMenuItems(productFeatures, permissions);
        
        
        if (filteredFeatures.length > 0) {
          const insertIndex = logoutIndex > -1 ? logoutIndex : menu.length;
          menu.splice(insertIndex, 0, ...filteredFeatures);
        }
      }
    }
  }

  // Filter the base menu (Dashboard, Settings, etc.) by permission and return
  return filterMenuItems(menu, permissions);
};

import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

/**
 * Role Category defines the semantic power-level of a role.
 * Used by policy templates (Phase 3) and hierarchy guards (Phase 2).
 *
 * ADMIN    → Full tenant control (level 1–9)
 * MANAGER  → Operational authority (level 10–49)
 * STAFF    → Day-to-day operations (level 50–89)
 * VIEWER   → Read-only (level 90–998)
 * CUSTOM   → Unrestricted category, level must be set manually
 */
export const ROLE_CATEGORIES = ["ADMIN", "MANAGER", "STAFF", "VIEWER", "CUSTOM"];

/**
 * Default level ranges per category — enforced at creation time in the service.
 */
export const CATEGORY_LEVEL_MAP = {
  ADMIN:   1,
  MANAGER: 10,
  STAFF:   50,
  VIEWER:  90,
  CUSTOM:  100,
};

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null, // null means it's a global system role
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    // ─── Phase 2: Hierarchy Level ───────────────────────────────────────────
    // Lower number = more authority. A user can only manage roles with a
    // HIGHER level number than their own (e.g., level 1 can manage level 50).
    level: {
      type: Number,
      default: 100,
      min: 1,
      max: 999,
    },

    // ─── Phase 4: Semantic Category ─────────────────────────────────────────
    // Drives policy auto-attachment templates. Even if a tenant names a role
    // "Supreme Boss", if its category is "STAFF", it only gets staff permissions.
    category: {
      type: String,
      enum: ROLE_CATEGORIES,
      default: "CUSTOM",
    },
  },
  { timestamps: true }
);

// 🔥 Compound index: Role code must be unique within a specific tenant (or globally if tenantId is null)
roleSchema.index({ code: 1, tenantId: 1 });

export const getRoleModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.Role || db.model("Role", roleSchema);
};
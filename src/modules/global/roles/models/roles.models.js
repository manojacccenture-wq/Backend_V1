import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

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
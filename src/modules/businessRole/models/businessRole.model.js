import mongoose from "mongoose";
import { getGlobalDB } from "../../../config/db/db.js";


const businessRoleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    isPreset: {
      type: Boolean,
      default: false, // true = seeded system preset, false = custom tenant role
    },
    capabilities: {
      type: [String], // ["users.view", "orders.create", ...]
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Unique role name per tenant
businessRoleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const getBusinessRoleModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");
  return db.models.BusinessRole || db.model("BusinessRole", businessRoleSchema);
};

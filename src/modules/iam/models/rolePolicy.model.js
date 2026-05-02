import mongoose from "mongoose";
import { getGlobalDB } from "../../../config/db/db.js";

const rolePolicySchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Policy",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate assignments
rolePolicySchema.index({ roleId: 1, policyId: 1 }, { unique: true });

export const getRolePolicyModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.RolePolicy || db.model("RolePolicy", rolePolicySchema);
};

import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      // required: true, //For Iam roles
    },


    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ─── Business Role System (NEW — parallel to IAM, additive only) ─────────
    // IAM roleId above is NEVER modified. This is a separate optional linkage.
    // null = member uses IAM-only path (all existing memberships)
    businessRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessRole",
      default: null,
    },
  },
  { timestamps: true }
);

membershipSchema.index(
  { userId: 1, tenantId: 1, productId: 1 },
  { unique: true }
);

export const getMembershipModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.Membership || db.model("Membership", membershipSchema);
};
import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const tenantSubscriptionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true, // One active subscription per tenant
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    status: {
      type: String,
      enum: ["trial", "active", "expired", "cancelled"],
      default: "trial",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date, // null means indefinite
      default: null,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    usageSnapshot: {
      currentUsers: { type: Number, default: 0 },
      currentProducts: { type: Number, default: 0 },
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null means system assigned
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export const getTenantSubscriptionModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.TenantSubscription || db.model("TenantSubscription", tenantSubscriptionSchema);
};

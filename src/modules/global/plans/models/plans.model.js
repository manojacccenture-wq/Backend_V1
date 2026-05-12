import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"],
      default: "monthly",
    },
    maxUsers: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    maxProducts: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    allowedFeatureKeys: {
      type: [String],
      default: [],
    },
    isTrialPlan: {
      type: Boolean,
      default: false,
    },
    trialDays: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

export const getPlanModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.Plan || db.model("Plan", planSchema);
};

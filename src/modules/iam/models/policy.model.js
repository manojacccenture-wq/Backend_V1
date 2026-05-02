import mongoose from "mongoose";
import { getGlobalDB } from "../../../config/db/db.js";

const statementSchema = new mongoose.Schema({
  effect: {
    type: String,
    enum: ["ALLOW", "DENY"],
    required: true,
  },
  actions: [{
    type: String,
    required: true,
  }],
  resources: [{
    type: String,
    required: true,
    default: ["*"],
  }],
}, { _id: false });

const policySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["MANAGED", "INLINE"],
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    statements: [statementSchema],
  },
  { timestamps: true }
);

export const getPolicyModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.Policy || db.model("Policy", policySchema);
};

import mongoose from "mongoose";
import { getGlobalDB } from "../../../config/db/db.js";


const capabilitySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // "users.view"
    },
    label: {
      type: String,
      required: true,
      trim: true,   // "View Users"
    },
    group: {
      type: String,
      required: true,
      trim: true,   // "User Management"
    },
    description: {
      type: String,
      default: "",
    },
    isDefault: {
      type: Boolean,
      default: false, // included in most preset roles
    },
  },
  { timestamps: false }
);

capabilitySchema.index({ group: 1 });

export const getCapabilityModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");
  return db.models.Capability || db.model("Capability", capabilitySchema);
};

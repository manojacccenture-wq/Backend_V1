import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const tenantSchema = new mongoose.Schema({
  name: String,
  dataMode: {
    type: String,
    enum: ["shared", "isolated"],
    default: "shared",
  },
  dbName: {
    type: String,
    unique: true,
    sparse: true, // because shared tenants may have null
  },
  isActive: {
    type: Boolean,
    default: true,
  }
});

export const getTenantModel = () => {
  const db = getGlobalDB();

  if (!db) {
    throw new Error("Global DB not initialized");
  }

  return db.models.Tenant || db.model("Tenant", tenantSchema);
};
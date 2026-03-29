import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const tenantSchema = new mongoose.Schema({
  name: String,
  dataMode: {
    type: String,
    enum: ["shared", "isolated"],
    default: "shared",
  },
  dbName: String,
  isActive:Boolean
});

export const getTenantModel = () => {
  const db = getGlobalDB();

  if (!db) {
    throw new Error("Global DB not initialized");
  }

  return db.models.Tenant || db.model("Tenant", tenantSchema);
};
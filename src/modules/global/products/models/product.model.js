import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

export const getProductModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.Product || db.model("Product", productSchema);
};
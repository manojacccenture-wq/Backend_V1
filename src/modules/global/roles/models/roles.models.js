import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
  },

  // ⚡ FAST CACHE
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],

  isActive: {
    type: Boolean,
    default: true,
  },
});

export const getUserModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.User || db.model("User", userSchema);
};
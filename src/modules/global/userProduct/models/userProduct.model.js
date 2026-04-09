import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const userProductSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },


  // status: {
  //   type: String,
  //   enum: ["active", "inactive"],
  //   default: "active",
  // },

  isActive: {
    type: Boolean,
    default: true,
  },


});

export const getUserProductModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.UserProduct || db.model("UserProduct", userProductSchema);
};
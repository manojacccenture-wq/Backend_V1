import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },


    isSystem: {
      type: Boolean,
      default: false,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      enum: [
        "SUPER_ADMIN",
        "TENANT_ADMIN",
        "PRODUCT_ADMIN",
        "PRODUCT_USER",
        "OWNER", // 🔥 important for your tenant logic
      ],
    }
    // tenantId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Tenant",
    //   default: null,
    // },

    // productId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Product",
    //   default: null,
    // },

  },
  { timestamps: true }
);



export const getRoleModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.Role || db.model("Role", roleSchema);
};
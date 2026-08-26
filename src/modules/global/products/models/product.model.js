import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    code: {
      type: String,
      required: true,
      unique: true, // 🔥 IMPORTANT (crm, billing)
    },

    description: String,

    url: {
      type: String,
      required: false, // Ensure backward compatibility with mock data
    },

    launchType: {
      type: String,
      default: "redirect", // "redirect" | "iframe" | "new_tab"
    },

    isExternal: {
      type: Boolean,
      default: true,
    },

    displayOrder: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const getProductModel = () => {
  const db = getGlobalDB();
  return db.models.Product || db.model("Product", productSchema);
};
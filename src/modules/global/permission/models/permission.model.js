import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // e.g. "user:create"
    },

    description: String,

    // optional grouping
    module: String, // "user", "product", etc.
  },
  { timestamps: true }
);

export const getPermissionModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.Permission || db.model("Permission", permissionSchema);
};
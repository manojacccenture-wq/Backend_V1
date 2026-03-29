import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const permissionSchema = new mongoose.Schema({
 name:String,

  isActive: {
    type: Boolean,
    default: true,
  },
});

export const getPermissionModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.Permission || db.model("permission", permissionSchema);
};
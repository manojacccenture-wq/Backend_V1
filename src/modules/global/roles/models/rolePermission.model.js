import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const rolePermissionSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    // permissionId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Permission",
    //   required: true,
    // },

    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
  },
  { timestamps: true }
);

export const getRolePermissionModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return (
    db.models.RolePermission ||
    db.model("RolePermission", rolePermissionSchema)
  );
};
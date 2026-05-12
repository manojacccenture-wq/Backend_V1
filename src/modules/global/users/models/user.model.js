import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
  },

  password: {
    type: String,
    required: true,
  },
  // tenantId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "Tenant",
  // },

  // ⚡ FAST CACHE
  // products: [
  //   {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: "Product",
  //   },
  // ],

  isActive: {
    type: Boolean,
    default: true,
  },
  mfaEnabled: {
    type: Boolean,
    default: false,
  },
  mfaSecret: {
    type: String,
  },
  mfaTempSecret: String,

  mfaEnabled: {
    type: Boolean,
    default: false,
  },

  isFirstTimeLogin: {
    type: Boolean,
    default: true,
  },
  role: {
    type: String,
    enum: ['SYSTEM_ADMIN', 'TENANT_USER'],
    default: 'TENANT_USER',
  },

}
  , { timestamps: true }
);

// Pro-Tip: Role Identification
userSchema.statics.isSystemAdmin = async function (email) {
  if (!email) return false;
  const user = await this.findOne({ email: email.toLowerCase() });
  return user?.role === 'SYSTEM_ADMIN';
};

export const getUserModel = () => {
  const db = getGlobalDB();
  if (!db) throw new Error("Global DB not initialized");

  return db.models.User || db.model("User", userSchema);
};
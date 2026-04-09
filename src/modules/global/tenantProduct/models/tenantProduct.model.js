import mongoose from "mongoose";
import { getGlobalDB } from "../../../../config/db/db.js";

const tenantProductSchema = new mongoose.Schema(
  {
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

    isEnabled: {
      type: Boolean,
      default: true,
    },

    config: {
      type: Object, // future configs
      default: {},
    },
  },
  { timestamps: true }
);

// 🔥 prevent duplicates
tenantProductSchema.index(
  { tenantId: 1, productId: 1 },
  { unique: true }
);

export const getTenantProductModel = () => {
  const db = getGlobalDB();
  return (
    db.models.TenantProduct ||
    db.model("TenantProduct", tenantProductSchema)
  );
};
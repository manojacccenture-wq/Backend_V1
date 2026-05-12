import mongoose from "mongoose";
import { getSharedDB } from "../../../../config/db/db";


const settingsSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
  },
  {
    timestamps: true,
  }
);

export const getSettingsModel = () => {
  const db = getSharedDB();

  return (
    db.models.Settings ||
    db.model("Settings", settingsSchema)
  );
};
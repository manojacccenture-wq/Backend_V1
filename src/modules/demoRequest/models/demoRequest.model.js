import mongoose from "mongoose";
import { getGlobalDB } from "../../../config/db/db.js";

const demoRequestSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    workEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
    },

    useCase: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "activated", "rejected"],
      default: "pending",
    },

    // ACTIVE STATE
    isActive: {
      type: Boolean,
      default: true,
    },

    // AFTER 14 DAYS -> DEACTIVATE
    expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },

    // AFTER 20 DAYS -> DELETE
    deleteAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// ================================
// TTL INDEX FOR AUTO DELETE
// ================================
demoRequestSchema.index(
  { deleteAt: 1 },
  { expireAfterSeconds: 0 }
);

// ================================
// PREVENT DIRECT STATUS MODIFICATION
// ================================
demoRequestSchema.pre("save", function () {
  if (this.isModified("status") && !this.isNew) {
    throw new Error(
      "Status cannot be modified directly. Use state transition methods."
    );
  }
});

// ================================
// MODEL FACTORY
// ================================
export const getDemoRequestModel = () => {
  const db = getGlobalDB();

  if (!db) {
    throw new Error("Global DB not initialized");
  }

  return (
    db.models.DemoRequest ||
    db.model("DemoRequest", demoRequestSchema)
  );
};
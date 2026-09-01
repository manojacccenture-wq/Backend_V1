import mongoose from "mongoose";
import { getGlobalDB } from "../../../config/db/db.js";

const integrationTaskSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, 
    payload: { type: Object, required: true }, 
    status: { type: String, enum: ["PENDING", "FAILED", "COMPLETED"], default: "PENDING" },
    retries: { type: Number, default: 0 },
    lastError: { type: String },
    nextRetryAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

let IntegrationTask;
export const getIntegrationTaskModel = () => {
  if (!IntegrationTask) {
    const db = getGlobalDB();
    IntegrationTask = db.model("IntegrationTask", integrationTaskSchema);
  }
  return IntegrationTask;
};

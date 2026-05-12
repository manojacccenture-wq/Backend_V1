import { getPlanModel } from "../models/plans.model.js";

export const createPlan = async (data) => {
  const Plan = getPlanModel();
  const existing = await Plan.findOne({ code: data.code.toUpperCase() });
  if (existing) {
    throw new Error(`Plan with code ${data.code} already exists`);
  }
  return await Plan.create(data);
};

export const updatePlan = async (id, data) => {
  const Plan = getPlanModel();
  const plan = await Plan.findByIdAndUpdate(id, data, { new: true });
  if (!plan) throw new Error("Plan not found");
  return plan;
};

export const deactivatePlan = async (id) => {
  const Plan = getPlanModel();
  const plan = await Plan.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!plan) throw new Error("Plan not found");
  return plan;
};

export const getPlans = async ({ page = 1, limit = 10, includeInactive = false }) => {
  const Plan = getPlanModel();
  const query = includeInactive ? {} : { isActive: true };
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Plan.find(query).sort({ price: 1 }).skip(skip).limit(limit).lean(),
    Plan.countDocuments(query),
  ]);

  return {
    data,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

export const getPlanById = async (id) => {
  const Plan = getPlanModel();
  const plan = await Plan.findById(id).lean();
  if (!plan) throw new Error("Plan not found");
  return plan;
};

// Initialize default plan if not exists
export const ensureDefaultTrialPlan = async () => {
  const Plan = getPlanModel();
  let defaultPlan = await Plan.findOne({ code: "STARTER_TRIAL" });
  if (!defaultPlan) {
    defaultPlan = await Plan.create({
      name: "Starter Trial",
      code: "STARTER_TRIAL",
      description: "Default 14-day trial plan",
      isActive: true,
      price: 0,
      maxUsers: 5,
      maxProducts: 1,
      isTrialPlan: true,
      trialDays: 14,
    });
  }
  return defaultPlan;
};

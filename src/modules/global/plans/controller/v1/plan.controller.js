
import { asyncHandler } from "../../../../../shared/utils/asyncHandler/asyncHandler.js";
import { createPlan, updatePlan, deactivatePlan, getPlans, getPlanById } from "../../services/plan.service.js";
import { planSchema } from "../../validation/plan.validation.js";

export const createPlanController = asyncHandler(async (req, res) => {
  const validationResult = planSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errorMsg = validationResult.error.errors.map(e => e.message).join(", ");
    throw new Error(`Validation Error: ${errorMsg}`);
  }

  const plan = await createPlan(validationResult.data);

  res.status(201).json({
    status: "success",
    data: plan,
  });
});

export const updatePlanController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validationResult = planSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errorMsg = validationResult.error.errors.map(e => e.message).join(", ");
    throw new Error(`Validation Error: ${errorMsg}`);
  }

  const plan = await updatePlan(id, validationResult.data);

  res.status(200).json({
    status: "success",
    data: plan,
  });
});

export const deactivatePlanController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await deactivatePlan(id);

  res.status(200).json({
    status: "success",
    data: plan,
  });
});

export const getPlansController = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const includeInactive = req.query.includeInactive === "true";

  const result = await getPlans({ page, limit, includeInactive });

  res.status(200).json({
    status: "success",
    data: result,
  });
});

export const getPlanByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await getPlanById(id);

  res.status(200).json({
    status: "success",
    data: plan,
  });
});

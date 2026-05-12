import { z } from "zod";

export const planSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters"),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  price: z.number().min(0, "Price cannot be negative").default(0),
  billingCycle: z.enum(["monthly", "yearly", "lifetime"]).default("monthly"),
  maxUsers: z.number().min(0).default(0),
  maxProducts: z.number().min(0).default(0),
  allowedFeatureKeys: z.array(z.string()).default([]),
  isTrialPlan: z.boolean().default(false),
  trialDays: z.number().min(0).default(0),
});

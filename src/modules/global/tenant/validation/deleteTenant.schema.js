import { z } from "zod";

export const deleteTenantSchema = z.object({
  tenantId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid tenant ID format"),
});

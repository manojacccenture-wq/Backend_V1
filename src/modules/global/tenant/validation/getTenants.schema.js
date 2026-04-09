import { z } from "zod";
import { paginationSchema } from "../../../../shared/validations/pagination.schema.js";



export const getTenantsSchema = paginationSchema.extend({
  dataMode: z.enum(["shared", "isolated"]).optional(),

  isActive: z.coerce.boolean().optional(),
});
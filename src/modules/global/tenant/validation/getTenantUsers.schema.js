import { z } from "zod";
import mongoose from "mongoose";
import { paginationSchema } from "../../../../shared/validations/pagination.schema.js";



export const getTenantUsersSchema = paginationSchema.extend({
  tenantId: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid tenantId",
    }),
});
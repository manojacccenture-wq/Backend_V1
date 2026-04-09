import { z } from "zod";

export const createTenantSchema = z.object({
  name: z
    .string()
    .min(3, "Tenant name must be at least 3 characters")
    .max(50),

  dataMode: z.enum(["shared", "isolated"]),

  email: z
    .string()
    .email("Invalid email format"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must include uppercase")
    .regex(/[a-z]/, "Must include lowercase")
    .regex(/[0-9]/, "Must include number"),
});
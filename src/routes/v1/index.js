import express from "express";
import authRoutes from "./auth/auth.routes.js"
import userRoutes from "./users/user.routes.js"
import tenantRoutes from "./tenant/tenant.routes.js"
import demoRequestRoutes from "./demoRequest/demo.routes.js";
import billingRoutes from "./billing/billing.routes.js";
import businessRoleRoutes from "../../modules/businessRole/routes/businessRole.routes.js";
import { accessAuthMiddleware } from "../../modules/auth/middleware/access.middleware.js";
import { listCapabilities } from "../../modules/businessRole/controller/v1/businessRole.controller.js";

const app = express();


app.use("/api/auth", authRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/users", userRoutes);
app.use("/api/demo-request", demoRequestRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/business-roles", businessRoleRoutes);
// Dedicated capabilities route — direct handler, no URL-rewrite tricks
app.get("/api/capabilities", accessAuthMiddleware, listCapabilities);

export default app;
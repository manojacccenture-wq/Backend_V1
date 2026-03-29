import express from "express";
import authRoutes from "./auth/auth.routes.js"
import tenantRoutes from "./tenant/tenant.routes.js"
import crmRoutes from "./crm/crm.routes.js"

const app = express();


app.use("/api/auth", authRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/crm",crmRoutes);

export default app;
import express from "express";
import authRoutes from "./auth/auth.routes.js"
import crmRoutes from "./crm/crm.routes.js"
import userRoutes from "./users/user.routes.js"
import tenantRoutes from "./tenant/tenant.routes.js"

const app = express();


app.use("/api/auth", authRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/crm",crmRoutes);
app.use("/api/users",userRoutes);
app.use("/api/tenant",tenantRoutes);

export default app;
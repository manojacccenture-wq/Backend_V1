import express from "express";
import {resolver} from "../../../modules/global/tenant/controller/v1/tenant.controller.js"

import {tenantMiddleware} from "../../../middleware/tenant/tenant.middleware.js"

const router = express.Router();

// simple login
router.get("/resolver", /* authMiddleware, */tenantMiddleware,resolver);


export default router;
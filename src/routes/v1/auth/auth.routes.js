import express from "express";
import { login ,verifyMFASetup,enableMFA,verifyLoginMFA} from "../../../modules/auth/controller/v1/auth.controller.js";
import { authMiddleware } from "../../../middleware/Auth/auth.middleware.js";

const router = express.Router();

// simple login
router.post("/login", login);

router.post("/enable-mfa", authMiddleware, enableMFA);

router.post("/verify-mfa-setup", authMiddleware, verifyMFASetup);

router.post("/verify-login-mfa", authMiddleware,verifyLoginMFA);

export default router;
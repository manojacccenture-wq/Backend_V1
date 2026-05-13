import express from "express";
import { login ,verifyMFASetup,enableMFA,verifyLoginMFA,refreshToken,logout, getMe, getSidebarMenu} from "../../../modules/auth/controller/v1/auth.controller.js";
import { tempAuthMiddleware } from "../../../modules/auth/middleware/temp.middleware.js";
import { accessAuthMiddleware } from "../../../modules/auth/middleware/access.middleware.js";
import { mfaSetupMiddleware } from "../../../modules/auth/middleware/mfaSetup.middleware.js";
import { refreshGuardMiddleware } from "../../../modules/auth/middleware/refreshGuard.middleware.js";

const router = express.Router();

//  login
router.post("/login", login);


//  after login (temp token) (To Verify the MFA code sent to the user)
router.post("/verify-login-mfa", tempAuthMiddleware, verifyLoginMFA);

//  To enable TOTP MFA for the user 
router.post("/enable-mfa", accessAuthMiddleware, enableMFA);

//  To Verify the setup of TOTP MFA for the user 
router.post("/verify-mfa-setup", mfaSetupMiddleware, verifyMFASetup);

// To get the new accessToken — guard skips rotation when access token is still valid
router.post("/refresh", refreshGuardMiddleware, refreshToken);

//  To clear all cookies and other things
router.post("/logout", accessAuthMiddleware, logout);

// To check user is authenticated or not and to get user details
router.get("/me", accessAuthMiddleware, getMe);

// To get the sidebar menu config based on the user's active context
router.get("/menu", accessAuthMiddleware, getSidebarMenu);

export default router;
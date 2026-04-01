import express from "express";
import { login ,verifyMFASetup,enableMFA,verifyLoginMFA,refreshToken,logout} from "../../../modules/auth/controller/v1/auth.controller.js";
import { tempAuthMiddleware } from "../../../modules/auth/middleware/temp.middleware.js";
import { accessAuthMiddleware } from "../../../modules/auth/middleware/access.middleware.js";
import { mfaSetupMiddleware } from "../../../modules/auth/middleware/mfaSetup.middleware.js";

const router = express.Router();

//  login
router.post("/login", login);


//  after login (temp token) (To Verify the MFA code sent to the user)
router.post("/verify-login-mfa", tempAuthMiddleware, verifyLoginMFA);

//  To enable TOTP MFA for the user 
router.post("/enable-mfa", accessAuthMiddleware, enableMFA);

//  To Verify the setup of TOTP MFA for the user 
router.post("/verify-mfa-setup", mfaSetupMiddleware, verifyMFASetup);

// To get the new accessToken
router.post("/refresh", refreshToken);

//  To clear all cookies and other things
router.post("/logout", accessAuthMiddleware, logout);

export default router;
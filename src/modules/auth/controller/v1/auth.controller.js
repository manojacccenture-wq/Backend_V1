import { loginService } from "../../services/login.service.js";
import { generateMFA } from "../../services/enableMfa.service.js";
import { verifyMFASetupService } from "../../services/verifyMFASetup.service.js";
import { verifyLoginService } from "../../services/verifyAuth.service.js";
import { generateAccessToken } from "../../utils/token.utils.js";
import { setAuthCookie } from "../../../../utils/cookies/cookie.util.js";
import logger from "../../../../shared/services/logger/logger.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await loginService(email, password);

    // MFA
    if (result.mfaRequired) {
      setAuthCookie(res, result.token);   // 🔥 replace
      return res.json({ mfaRequired: true });
    }

    if (result.emailOtpRequired) {
      setAuthCookie(res, result.token);   // 🔥 replace
      return res.json({ emailOtpRequired: true });
    }

  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
};

export const enableMFA = async (req, res) => {
  try {
    const userId = req.user.userId; // from auth middleware
    const email = req.user.email;

    const { qrCode, token } = await generateMFA(userId, email);



    setAuthCookie(res, token);
    res.json({
      msg: "Scan QR code",
      qrCode,
    });

  } catch (error) {
    logger.error("Error generating MFA:", error);
    res.status(500).json({ msg: "Failed to generate MFA" });
  }
};

export const verifyLoginMFA = async (req, res) => {
  try {
    const { token } = req.body; // OTP
    const { userId, type } = req.user;
    logger.info("Verifying login MFA", { userId, type });
    logger.info("OTP received", { token });

    if (!userId || !type) {
      return res.status(401).json({ msg: "Invalid token" });
    }

    // 🔥 ONLY SERVICE CALL
    const user = await verifyLoginService(userId, token, type);

    // 🔐 JWT
    const accessToken = generateAccessToken(user);

    setAuthCookie(res, accessToken);


    return res.json({ msg: "Login successful" });

  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
};

export const verifyMFASetup = async (req, res) => {
  try {
    const { token } = req.body;

    await verifyMFASetupService(req.user.userId, token);

    res.json({ msg: "MFA enabled successfully" });

  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
};





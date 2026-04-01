import crypto from "crypto";
import jwt from "jsonwebtoken";
import { loginService } from "../../services/login.service.js";
import { generateMFA } from "../../services/enableMfa.service.js";
import { verifyMFASetupService } from "../../services/verifyMFASetup.service.js";
import { verifyLoginService } from "../../services/verifyAuth.service.js";
import { generateAccessToken, generateRefreshToken, hashToken } from "../../authUtils/token.utils.js";
import { clearAuthCookie, setAuthCookie, setMfaSetupCookie, setTempAuthCookie } from "../../../../shared/utils/cookies/cookie.util.js";

import { getRedis } from "../../../../config/redis/redis.js";
import { refreshTokenService } from "../../services/refresh.service.js";

export const generateSessionId = () => {
  return crypto.randomBytes(32).toString("hex"); // 64-char secure id
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await loginService(email, password);
    // MFA
    if (result.mfaRequired) {
      setTempAuthCookie(res, result.token);
      // setAuthCookie(res, result.token);   // 🔥 replace
      return res.json({ mfaRequired: true });
    }

    if (result.emailOtpRequired) {
      setTempAuthCookie(res, result.token);
      // setAuthCookie(res, result.token);   // 🔥 replace
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



    setMfaSetupCookie(res, token);
    res.json({
      msg: "Scan QR code",
      qrCode,
    });

  } catch (error) {
    res.status(500).json({ msg: "Failed to generate MFA" });
  }
};

export const verifyLoginMFA = async (req, res) => {
  try {
    const { token } = req.body;
    const { userId, type } = req.user;

    if (!userId || !type) {
      return res.status(401).json({ msg: "Invalid token" });
    }

    const user = await verifyLoginService(userId, token, type);

    const redis = getRedis();

    const sessionId = generateSessionId();


    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, sessionId);

    // 🔥 SaaS-grade device tracking
    const sessionData = {
      token: hashToken(refreshToken),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      createdAt: Date.now(),
    };

    await redis.set(
      `refresh:${user._id}:${sessionId}`,
      JSON.stringify(sessionData),
      { EX: 60 * 60 * 24 * 7 }
    );

    //  SET BOTH TOKENS ( Access Token + Refresh Token )
    setAuthCookie(res, accessToken, refreshToken);

    //  cleanup temp cookies
    res.clearCookie("token");
    res.clearCookie("mfaSetupToken");

    return res.json({
      msg: "Login successful",
      isFirstTimeLogin: user.isFirstTimeLogin,
    });

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



export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    const { accessToken, refreshToken } =
      await refreshTokenService(token);

    res.cookie("accessToken", accessToken, { httpOnly: true });
    res.cookie("refreshToken", refreshToken, { httpOnly: true });

    return res.json({ msg: "Token rotated" });

  } catch (error) {


    return res.status(401).json({
      msg: error.message || "Invalid refresh token",
    });
  }
};



export const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const redis = getRedis();

      await redis.del(`refresh:${decoded.userId}:${decoded.sessionId}`);
    }

    clearAuthCookie(res);

    return res.json({ msg: "Logged out successfully" });

  } catch (error) {
    return res.status(200).json({ msg: "Logged out" });
    // don't expose error (security)
  }
};


export const getUserSessions = async (req, res) => {
  const userId = req.user.userId;
  const redis = getRedis();

  const keys = await redis.keys(`refresh:${userId}:*`);

  const sessions = [];

  for (const key of keys) {
    const data = await redis.get(key);
    sessions.push({
      sessionId: key.split(":")[2],
      ...JSON.parse(data),
    });
  }

  res.json(sessions);
};
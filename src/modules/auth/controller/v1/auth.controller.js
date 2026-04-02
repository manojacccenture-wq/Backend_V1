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
import { asyncHandler } from "../../../../shared/utils/asyncHandler/asyncHandler.js";

export const generateSessionId = () => {
  return crypto.randomBytes(32).toString("hex"); // 64-char secure id
};

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await loginService(email, password);

  if (result.mfaRequired) {
    setTempAuthCookie(res, result.token);
    return res.json({ mfaRequired: true });
  }

  if (result.emailOtpRequired) {
    setTempAuthCookie(res, result.token);
    return res.json({ emailOtpRequired: true });
  }
});

export const enableMFA = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const email = req.user.email;

  if (!userId || !email) {
    throw new Error("Invalid user context");
  }

  const { qrCode, token } = await generateMFA(userId, email);

  setMfaSetupCookie(res, token);

  res.json({
    msg: "Scan QR code",
    qrCode,
  });
});

export const verifyLoginMFA = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const { userId, type } = req.user;

  if (!userId || !type) {
    throw new Error("Invalid token");
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
  
  console.log('AFter Login  sessionId: ', sessionId)
  await redis.set(
    `refresh:${user._id}:${sessionId}`,
    JSON.stringify(sessionData),
    { EX: 60 * 60 * 24 * 7 }
  );

  setAuthCookie(res, accessToken, refreshToken);

  res.clearCookie("token");
  res.clearCookie("mfaSetupToken");

  res.json({
    msg: "Login successful",
    isFirstTimeLogin: user.isFirstTimeLogin,
  });
});

export const verifyMFASetup =asyncHandler( async (req, res) => {
  try {
    const { token } = req.body;

    await verifyMFASetupService(req.user.userId, token);

    res.json({ msg: "MFA enabled successfully" });

  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});



export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;

  const { accessToken, refreshToken } =
    await refreshTokenService(token);

  res.cookie("accessToken", accessToken, { httpOnly: true });
  res.cookie("refreshToken", refreshToken, { httpOnly: true });

  res.json({ msg: "Token rotated" });
});



export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;

  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const redis = getRedis();

    await redis.del(`refresh:${decoded.userId}:${decoded.sessionId}`);
  }

  clearAuthCookie(res);

  res.json({ msg: "Logged out successfully" });
});


export const getUserSessions = asyncHandler(async (req, res) => {
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
});

export const getMe = asyncHandler(async (req, res) => {
  const user = req.user; // from token

  res.json({
    // user,
    isAuthenticated: true,
  });
});
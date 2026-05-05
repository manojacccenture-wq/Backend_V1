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
import { getMembershipModel } from "../../../global/membership/models/membership.model.js";
import { getRoleModel } from "../../../global/roles/models/roles.models.js";
import { buildUserContext, getUserMemberships } from "../../services/buildUserContext.service.js";

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

  //  STEP 1: verify user
  const user = await verifyLoginService(userId, token, type);

  // STEP 2: build initial context (Global or Default)
  const context = await buildUserContext(user._id);

  const redis = getRedis();
  const sessionId = generateSessionId();

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user, sessionId);

  // session store
  await redis.set(
    `refresh:${user._id}:${sessionId}`,
    JSON.stringify({
      token: hashToken(refreshToken),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      createdAt: Date.now(),
    }),
    { EX: 60 * 60 * 24 * 7 }
  );

  setAuthCookie(res, accessToken, refreshToken);

  res.clearCookie("token");
  res.clearCookie("mfaSetupToken");

  res.json({
    msg: "Login successful",
    isFirstTimeLogin: user.isFirstTimeLogin,
    isSuperAdmin: context?.isSuperAdmin || false,
  });
});


export const verifyMFASetup = asyncHandler(async (req, res) => {
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

  setAuthCookie(res, accessToken, refreshToken);


  res.json({ msg: "Token rotated" });
});



export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const redis = getRedis();

      // 🔥 FIX: Use req.user.email instead of the undefined 'email' variable
      if (req.user && req.user.email) {
        await redis.del(`auth:email:${req.user.email}`);
      }

      // Delete other session keys
      await redis.del(`auth:session:${decoded.userId}`);
      await redis.del(`refresh:${decoded.userId}:${decoded.sessionId}`);
      
    } catch (err) {
      console.warn("Invalid token during logout, proceeding to clear cookies.");
    }
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
  const userId = req.user.userId;
  const tenantId = req.headers["x-tenant-id"] || null;

  // 🔥 Execute both independent queries concurrently using Promise.all
  // This executes them in parallel, halving the I/O wait time if they take similar times.
  const [context, memberships] = await Promise.all([
    buildUserContext(userId, tenantId),
    getUserMemberships(userId)
  ]);



  res.json({
    userId,
    email: req.user.email,
    activeContext: context,
    tenants: memberships.map(m => ({
      tenantId: m.tenantId ? m.tenantId._id : null,
      tenantName: m.tenantId ? m.tenantId.name : null,
      // productId: m.productId,
      role: m.roleId ? m.roleId.code : null
    })),
    isAuthenticated: true,
  });
});
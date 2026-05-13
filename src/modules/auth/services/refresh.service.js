import jwt from "jsonwebtoken";
import crypto from "crypto";

import { generateAccessToken, generateRefreshToken, hashToken } from "../authUtils/token.utils.js";
import { getRedis } from "../../../config/redis/redis.js";

export const generateSessionId = () => {
  return crypto.randomBytes(32).toString("hex"); // 64-char secure id
};

export const refreshTokenService = async (token) => {

  if (!token) {
    throw new Error("No refresh token");
  }

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  
  console.log('decoded: ', decoded)
  const { userId, sessionId } = decoded;

  const redis = getRedis();
  const key = `refresh:${userId}:${sessionId}`;
  


  const sessionData = await redis.get(key);
  console.log('sessionData: ', sessionData)

  let session;
  let currentSessionId = sessionId;
  let activeKey = key;

  if (!sessionData) {
    // Generate new session ID and object if not found
    currentSessionId = generateSessionId();
    activeKey = `refresh:${userId}:${currentSessionId}`;
    session = {
      createdAt: Date.now(),
    };
  } else {
    session = JSON.parse(sessionData);

    // 🔐 Validate token
    if (session.token !== hashToken(token)) {
      // await redis.del(key);
      throw new Error("Token reuse detected");
    }
  }

  // 🔥 ROTATE TOKEN
  const newAccessToken = generateAccessToken(decoded);

  const newRefreshToken = generateRefreshToken(decoded, currentSessionId);

  // update stored token
  session.token = hashToken(newRefreshToken);

  await redis.set(activeKey, JSON.stringify(session), {
    EX: 60 * 60 * 24 * 7,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};
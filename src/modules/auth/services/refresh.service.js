import jwt from "jsonwebtoken";

import { generateAccessToken, generateRefreshToken, hashToken } from "../authUtils/token.utils.js";
import { getRedis } from "../../../config/redis/redis.js";

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
  console.log('sessionId In Refresh Service: ', sessionId)


  const sessionData = await redis.get(key);

  if (!sessionData) {
    throw new Error("Session expired");
  }

  const session = JSON.parse(sessionData);

  // 🔐 Validate token
  if (session.token !== hashToken(token)) {
    await redis.del(key);
    throw new Error("Token reuse detected");
  }

  // 🔥 ROTATE TOKEN
  const newAccessToken = generateAccessToken({ _id: userId });

  const newRefreshToken = generateRefreshToken(
    { _id: userId },
    sessionId
  );

  // update stored token
  session.token = hashToken(newRefreshToken);

  await redis.set(key, JSON.stringify(session), {
    EX: 60 * 60 * 24 * 7,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};
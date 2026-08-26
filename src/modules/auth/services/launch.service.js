import crypto from "crypto";
import { getRedis } from "../../../config/redis/redis.js";

const TOKEN_PREFIX = "launch_token:";
const TOKEN_TTL_SECONDS = 60;

/**
 * Generates a one-time launch token and stores it in Redis.
 * @param {Object} payload The contextual payload to store with the token
 * @returns {string} The secure 64-character hex token
 */
export const generateLaunchToken = async (payload) => {
  const token = crypto.randomBytes(32).toString("hex");
  const redis = getRedis();
  
  const tokenPayload = {
    ...payload,
    issuedAt: Date.now(),
    expiresAt: Date.now() + (TOKEN_TTL_SECONDS * 1000)
  };

  // Store in Redis with EX (expire in seconds)
  await redis.set(`${TOKEN_PREFIX}${token}`, JSON.stringify(tokenPayload), {
    EX: TOKEN_TTL_SECONDS
  });

  return token;
};

/**
 * Validates a launch token. If valid, deletes it immediately to ensure single-use.
 * @param {string} token The token to validate
 * @returns {Object|null} The payload if valid, or null if invalid/expired
 */
export const validateLaunchToken = async (token) => {
  const redis = getRedis();
  const key = `${TOKEN_PREFIX}${token}`;

  // Atomic operation is best, but GET followed by DEL is standard if not using lua scripts.
  // We can use a multi block to guarantee atomicity, or simply GET then DEL.
  const payloadString = await redis.get(key);

  if (!payloadString) {
    return null;
  }

  // Delete the token immediately to ensure single-use (Replay protection)
  await redis.del(key);

  try {
    return JSON.parse(payloadString);
  } catch (error) {
    return null;
  }
};

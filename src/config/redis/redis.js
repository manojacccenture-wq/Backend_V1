import { createClient } from "redis";
import logger from "../../shared/services/logger/logger.js";

let redisClient;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on("connect", () => {
          logger.info(`🚀 Redis Connected`);
    });

    redisClient.on("error", (err) => {
      logger.error("Redis Error:", err);
    });

    await redisClient.connect();
  } catch (error) {
    logger.error("Error connecting to Redis:", error);
  }
};

export const getRedis = () => redisClient;
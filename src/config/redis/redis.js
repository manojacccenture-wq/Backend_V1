import { createClient } from "redis";


let redisClient;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on("connect", () => {
          console.log(`🚀 Redis Connected`);
    });

    redisClient.on("error", (err) => {
      console.error("Redis Error:", err);
    });

    await redisClient.connect();
  } catch (error) {
    console.error("Error connecting to Redis:", error);
  }
};

export const getRedis = () => redisClient;
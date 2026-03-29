import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db/db.js";
import { connectRedis } from "./config/redis/redis.js";
import { seedData } from "./utils/seeder/seed.js";
import logger from "./shared/services/logger/logger.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await connectRedis();
  // await seedData();

  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
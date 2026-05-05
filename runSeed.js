import dotenv from "dotenv";
import { connectDB } from "./src/config/db/db.js";
import { connectRedis } from "./src/config/redis/redis.js";
import { seedData } from "./src/shared/utils/seeder/seed.js";
import { initModels } from "./src/config/initModels/initModels.js";

dotenv.config();

const run = async () => {
  await connectDB();
  await connectRedis();
  await initModels();
  await seedData();
  process.exit(0);
};

run().catch(console.error);

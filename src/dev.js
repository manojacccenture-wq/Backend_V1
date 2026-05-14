import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db/db.js";
import { connectRedis } from "./config/redis/redis.js";
import { seedData } from "./shared/utils/seeder/seed.js";
import { initModels } from "./config/initModels/initModels.js";
import { getCapabilityModel } from "./modules/businessRole/models/capability.model.js";
import { CAPABILITY_REGISTRY } from "./modules/businessRole/constants/capabilities.constants.js";

dotenv.config();

let isConnected = false;

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await connectRedis();
  // await seedData();

  app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`)
  });
};

startServer();


const init = async () => {
  if (!isConnected) {
    await connectDB();
    await connectRedis();
    initModels();
    isConnected = true;
    console.log("✅ DB + Redis connected");
  }
};


// 🔥 This runs on every request (serverless)
export default async function handler(req, res) {
  await init();
  return app(req, res);
}
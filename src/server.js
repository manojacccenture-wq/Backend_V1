import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db/db.js";
import { connectRedis } from "./config/redis/redis.js";
import { initModels } from "./config/initModels/initModels.js";
import { seedData } from "./shared/utils/seeder/seed.js";

dotenv.config();

let isConnected = false;

const init = async () => {
  if (!isConnected) {
    await connectDB();
    await connectRedis();
    initModels();

    const { getUserModel } = await import("./modules/global/users/models/user.model.js");
    const User = getUserModel();
    const adminExists = await User.findOne({ email: "jraman@lhsindia.com" });
    if (!adminExists) {
      await seedData();
    }

    isConnected = true;
    console.log("✅ DB + Redis connected");
  }
};

export default async function handler(req, res) {
  await init();
  return app(req, res); // 🔥 THIS IS THE FIX
}
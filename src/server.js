import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db/db.js";
import { connectRedis } from "./config/redis/redis.js";

dotenv.config();

let isConnected = false;

const init = async () => {
  if (!isConnected) {
    await connectDB();
    await connectRedis();
    isConnected = true;
    console.log("✅ DB + Redis connected");
  }
};

export default async function handler(req, res) {
  await init();
  return app(req, res); // 🔥 THIS IS THE FIX
}
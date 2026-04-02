import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db/db.js";
import { connectRedis } from "./config/redis/redis.js";


dotenv.config();

let isConnected = false;

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await connectRedis();
  // await seedData();

  app.listen(PORT, () => {
    console.log(" Server running on port ${PORT}")
  });
};

startServer();


const init = async () => {
  if (!isConnected) {
    await connectDB();
    await connectRedis();
    isConnected = true;
    console.log("✅ DB + Redis connected");
  }
};


// 🔥 This runs on every request (serverless)
export default async function handler(req, res) {
  await init();
  return app(req, res);
}
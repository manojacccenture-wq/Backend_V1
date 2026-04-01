import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db/db.js";
import { connectRedis } from "./config/redis/redis.js";


dotenv.config();

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
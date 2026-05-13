import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db/db.js";
import { connectRedis } from "./config/redis/redis.js";
import { initModels } from "./config/initModels/initModels.js";
import { seedData } from "./shared/utils/seeder/seed.js";
import { getCapabilityModel } from "./modules/businessRole/models/capability.model.js";
import { CAPABILITY_REGISTRY } from "./modules/businessRole/constants/capabilities.constants.js";

dotenv.config();

let isConnected = false;

const init = async () => {
  if (!isConnected) {
    await connectDB();
    await connectRedis();
    initModels();

    // ⚡ Idempotent capability boot seeder — runs on every start, safe to re-run
    // Uses $setOnInsert via bulkWrite so existing capabilities are NEVER overwritten
    const Capability = getCapabilityModel();
    const capCount = await Capability.countDocuments();
    if (capCount === 0) {
      const ops = CAPABILITY_REGISTRY.map((cap) => ({
        updateOne: {
          filter: { key: cap.key },
          update: { $setOnInsert: cap },
          upsert: true,
        },
      }));
      await Capability.bulkWrite(ops, { ordered: false });
      console.log(`⚡ Capability registry seeded (${CAPABILITY_REGISTRY.length} entries)`);
    }

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
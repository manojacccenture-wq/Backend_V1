import mongoose from "mongoose";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const connectDB = async () => {
  await mongoose.connect(process.env.GLOBAL_DB);
};

const run = async () => {
  await connectDB();
  const products = await mongoose.connection.collection("products").find({}).toArray();
  console.log(JSON.stringify(products, null, 2));
  process.exit(0);
};

run();

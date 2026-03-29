import mongoose from "mongoose";
import logger from "../../shared/services/logger/logger.js";

let globalConnection;
let sharedConnection;

export const connectDB = async () => {
  try {
    globalConnection = await mongoose.createConnection(process.env.GLOBAL_DB);
        
    logger.info(" Global DB Connected");

    sharedConnection = await mongoose.createConnection(process.env.SHARED_DB);
    logger.info(" Shared DB Connected");
  } catch (error) {
    logger.error("DB Error:", error);
    process.exit(1);
  }
};

export const getGlobalDB = () => globalConnection;
export const getSharedDB = () => sharedConnection;
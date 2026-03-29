import mongoose from "mongoose";
import { getSharedDB } from "../../config/db/db.js";
import logger from "../../shared/services/logger/logger.js";


const tenantConnections = {};

export const getDBConnection = async (tenant) => {
  //  Shared Mode
  if (tenant.dataMode === "shared") {
    return getSharedDB();
  }

  //  Isolated Mode
  const dbName = tenant.dbName;

  // reuse connection if exists
  if (!tenantConnections[dbName]) {
    tenantConnections[dbName] = await mongoose.createConnection(
      `${process.env.BASE_MONGO_URI}/${dbName}`
    );
    

    logger.info(` Connected to ${dbName}`);
  }

  return tenantConnections[dbName];
};
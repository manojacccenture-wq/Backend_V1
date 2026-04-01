import mongoose from "mongoose";


let globalConnection;
let sharedConnection;

export const connectDB = async () => {
  try {
    globalConnection = await mongoose.createConnection(process.env.GLOBAL_DB);
        
    console.log(" Global DB Connected");

    sharedConnection = await mongoose.createConnection(process.env.SHARED_DB);
    console.log(" Shared DB Connected");
  } catch (error) {
    console.error("DB Error:", error);
    process.exit(1);
  }
};

export const getGlobalDB = () => globalConnection;
export const getSharedDB = () => sharedConnection;
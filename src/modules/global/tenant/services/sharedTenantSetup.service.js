import { getSharedDB } from "../../../../config/db/db.js";

export const createSharedTenantSetup = async ({
  tenantId,
}) => {

  const sharedDB = getSharedDB();

  const session = await sharedDB.startSession();

  session.startTransaction();

  try {

    // SETTINGS
    await sharedDB.collection("settings").insertOne(
      {
        tenantId,

        currency: "INR",

        timezone: "Asia/Kolkata",

        createdAt: new Date(),

        updatedAt: new Date(),
      },
      { session }
    );




    await session.commitTransaction();

    return true;

  } catch (error) {

    await session.abortTransaction();

    throw error;

  } finally {

    session.endSession();

  }
};
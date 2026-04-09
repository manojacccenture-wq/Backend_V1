import { getMembershipModel } from "../models/membership.model.js";


export const createMembership = async (
  userId,
  tenantId,
  roleId,
  session
) => {
  const Membership = getMembershipModel();

  const exists = await Membership.findOne({
    userId,
    tenantId,
  }).session(session);

  if (exists) {
    throw new Error("User already exists in this tenant");
  }

  return Membership.create(
    [
      {
        userId,
        tenantId,
        roleId,
      },
    ],
    { session }
  );
};
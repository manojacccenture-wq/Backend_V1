import { getUserModel } from "../../users/models/user.model.js";
import { getUserProductModel } from "../models/userProduct.model.js";

// ✅ Assign product
export const assignProductToUser = async ({
  userId,
  productId,
  tenantId,
  role = "user",
}) => {
  const User = getUserModel();
  const UserProduct = getUserProductModel();

  // 1. mapping (source of truth)
  await UserProduct.create({
    userId,
    productId,
    tenantId,
    role,
  });

  // 2. update user cache
  await User.findByIdAndUpdate(userId, {
    $addToSet: { products: productId },
  });
};

// ❌ Remove product
export const removeProductFromUser = async ({
  userId,
  productId,
}) => {
  const User = getUserModel();
  const UserProduct = getUserProductModel();

  // 1. remove mapping
  await UserProduct.deleteOne({ userId, productId });

  // 2. update user cache
  await User.findByIdAndUpdate(userId, {
    $pull: { products: productId },
  });
};
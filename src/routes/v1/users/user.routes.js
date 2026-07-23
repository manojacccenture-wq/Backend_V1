import express from "express";

import { createUser,getUsers,resetUserTotp} from "../../../modules/global/users/controller/v1/user.controller.js";
import { requireCapability } from "../../../modules/businessRole/middleware/requireCapability.middleware.js";
import { accessAuthMiddleware } from "../../../modules/auth/middleware/access.middleware.js";
import { contextMiddleware } from "../../../modules/auth/middleware/context.middleware.js";

const router = express.Router();


router.post("/", createUser);
router.get("/", getUsers);
// router.put("/:id", updateUser);
// router.delete("/:id", deleteUser);

router.post("/:id/reset-totp", accessAuthMiddleware, contextMiddleware, requireCapability("users.reset_mfa"), resetUserTotp);


export default router;
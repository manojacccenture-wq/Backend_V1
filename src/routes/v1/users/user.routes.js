import express from "express";

import { createUser,getUsers} from "../../../modules/global/users/controller/v1/user.controller.js";


const router = express.Router();


router.post("/", createUser);
router.get("/", getUsers);
// router.put("/:id", updateUser);
// router.delete("/:id", deleteUser);




export default router;
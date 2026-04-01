import mongoose from "mongoose";
import { getCustomerModel } from "../models/crm.model.js";

import { getDBConnection } from "../../../shared/utils/dbSwitcher/dbSwitcher.js";


export const getCustomers = async (req, res) => {
  try {
    const tenant = req.tenant;

    // 🔥 get correct DB
    const db = await getDBConnection(tenant);

    // 🔥 get model from that DB
    const Customer = getCustomerModel(db);

    let customers;

    // 🟢 shared
    if (tenant.dataMode === "shared") {
      customers = await Customer.find({
        tenantId: new mongoose.Types.ObjectId(req.user.tenantId),
      });
    } else {
      customers = await Customer.find();
    }

    res.json(customers);
  } catch (error) {
    res.status(500).json({ msg: "Error fetching customers" });
  }
};
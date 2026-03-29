import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  name: String,
  email: String,
  tenantId: String, // only for shared mode
});

export const getCustomerModel = (connection) => {
  return (
    connection.models.Customer ||
    connection.model("Customer", customerSchema)
  );
};
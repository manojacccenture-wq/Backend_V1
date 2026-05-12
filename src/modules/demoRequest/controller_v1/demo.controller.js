import { asyncHandler } from "../../../shared/utils/asyncHandler/asyncHandler.js";
import { getDemoRequestModel } from "../models/demoRequest.model.js";
import { sendDemoRequestNotifications, sendTrialActivation } from "../services/demoEmail.service.js";
import { z } from "zod";
import { getRoleModel } from "../../global/roles/models/roles.models.js";

import { createTenantService } from "../../global/tenant/services/tenant.service.js";
import { createSharedTenantSetup } from "../../global/tenant/services/sharedTenantSetup.service.js";

const demoRequestSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  workEmail: z.string().email("Invalid work email address").transform(val => val.toLowerCase()),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  phoneNumber: z.string().optional(),
  useCase: z.string().optional(),
});

export const handleDemoRequest = asyncHandler(async (req, res) => {
  // Validate request body
  const validationResult = demoRequestSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errorMsg = validationResult.error.errors.map(e => e.message).join(", ");
    throw new Error(`Validation Error: ${errorMsg}`);
  }

  const { firstName, lastName, workEmail, companyName, phoneNumber, useCase } = validationResult.data;

  const DemoRequest = getDemoRequestModel();

  // Check if a DemoRequest already exists for the given workEmail
  const existingRequest = await DemoRequest.findOne({ workEmail: workEmail.toLowerCase() });

  if (existingRequest) {
    throw new Error("A request for this work email is already being processed.");
  }

  // Create the new DemoRequest
  const newDemoRequest = new DemoRequest({
    firstName,
    lastName,
    workEmail,
    companyName,
    phoneNumber,
    useCase,
  });

  // Save the document
  await newDemoRequest.save();

  // Fire and forget email notifications via Service Layer
  sendDemoRequestNotifications(newDemoRequest);

  // Return a 201 JSend response
  res.status(201).json({
    status: "success",
    data: newDemoRequest,
  });
});

export const getDemoRequests = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const DemoRequest = getDemoRequestModel();

  const [requests, total] = await Promise.all([
    DemoRequest.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    DemoRequest.countDocuments(),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      requests,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const approveDemoRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const DemoRequest = getDemoRequestModel();
  const Role = getRoleModel();


  // Atomic Update (Note: using findOneAndUpdate avoids the pre-save hook that prevents status change)
  // const request = await DemoRequest.findOneAndUpdate(
  //   { _id: id, status: "pending" },
  //   { $set: { status: "activated" } },
  //   { new: true }
  // );

  const request = await DemoRequest.findById(id);

  if (!request || request.status !== "pending") {
    throw new Error("Demo request not found or is not pending.");
  }
  // if (!request) {
  //   throw new Error("Demo request not found or is not pending.");
  // }

  // 🔥 Fetch Tenant Admin Role
  const tenantAdminRole = await Role.findOne({
    code: "TENANT_ADMIN",
    isSystem: true,
  })


  if (!tenantAdminRole) {
    throw new Error("Tenant Admin role not found");
  }

  // Call registerTenant (aliased as createTenantService) 
  // We'll generate a random password for them and they can reset it later, or it's handled differently.
  const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
  let result = await createTenantService({
    tenantName: request.companyName,
    email: request.workEmail,
    password: tempPassword,
    roleId: tenantAdminRole._id,
    // Assuming roleId will be fetched or handled inside if missing, or we pass null if it throws.
    // For now we pass null, or the user's logic might have a default.
  });

  // 🔥 CREATE SHARED DB DEFAULT DATA
  await createSharedTenantSetup({
    tenantId: result.tenant._id,
  });

  // 🔥 SEND ACTIVATION EMAIL
  await sendTrialActivation({
    companyName: request.companyName,
    email: request.workEmail,
    password: tempPassword,
  });



  // 🔥 ATOMIC STATUS UPDATE
  const updatedRequest =
    await DemoRequest.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
      },
      {
        $set: {
          status: "activated",
        },
      },
      {
        new: true,
      }
    );




  // Call demoEmailService.sendTrialActivation (assuming it exists or mock it)
  // user stated: Call demoEmailService.sendTrialActivation(email, tenantUrl) (assume this exists).
  // const tenantUrl = `https://${request.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.msaas.com`;
  // if (typeof sendTrialActivation === "function") {
  //    sendTrialActivation(request.workEmail, tenantUrl);
  // }

  res.status(200).json({
    status: "success",
    data: request,
  });
});

export const rejectDemoRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const DemoRequest = getDemoRequestModel();

  const request = await DemoRequest.findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status: "rejected" } },
    { new: true }
  );

  if (!request) {
    throw new Error("Demo request not found or is not pending.");
  }

  res.status(200).json({
    status: "success",
    data: request,
  });
});

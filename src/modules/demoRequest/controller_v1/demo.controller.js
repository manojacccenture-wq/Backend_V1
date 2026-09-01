import { asyncHandler } from "../../../shared/utils/asyncHandler/asyncHandler.js";
import { getDemoRequestModel } from "../models/demoRequest.model.js";
import { sendDemoRequestNotifications, sendTrialActivation } from "../services/demoEmail.service.js";
import { z } from "zod";
import { getBusinessRoleModel } from "../../businessRole/models/businessRole.model.js";
import { seedPresetBusinessRoles } from "../../businessRole/services/businessRole.service.js";

import { createTenantService } from "../../global/tenant/services/tenant.service.js";
import { createSharedTenantSetup } from "../../global/tenant/services/sharedTenantSetup.service.js";
import { getProductModel } from "../../global/products/models/product.model.js";
import { getTenantProductModel } from "../../global/tenantProduct/models/tenantProduct.model.js";
import { getUserProductModel } from "../../global/userProduct/models/userProduct.model.js";
import { provisionFoodERPTenant, provisionFoodERPUser } from "../../../shared/services/fooderp/fooderpProvisioning.service.js";
import { getUserModel } from "../../global/users/models/user.model.js";
import { getMembershipModel } from "../../global/membership/models/membership.model.js";
import { deleteTenantCascade } from "../../global/tenant/services/deleteTenantCascade.service.js";
import { getTenantModel } from "../../global/tenant/models/tenant.model.js";

const demoRequestSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  workEmail: z.string().email("Invalid work email address").transform(val => val.toLowerCase()),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  phoneNumber: z.string().optional(),
  useCase: z.string().optional(),
});

export const handleDemoRequest = asyncHandler(async (req, res) => {
  // Validate request body
  const validationResult = demoRequestSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errorMsg = validationResult.error.issues.map(e => e.message).join(", ");
    throw new Error(`Validation Error: ${errorMsg}`);
  }

  const { fullName, workEmail, companyName, phoneNumber, useCase } = validationResult.data;

  const DemoRequest = getDemoRequestModel();

  // Check if a DemoRequest already exists for the given workEmail
  const existingRequest = await DemoRequest.findOne({ workEmail: workEmail.toLowerCase(), status: { $in: ["pending", "activated"] } });

  if (existingRequest) {
    throw new Error("A request for this work email is already being processed.");
  }

  // Create the new DemoRequest
  const newDemoRequest = new DemoRequest({
    fullName,
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
  const BusinessRole = getBusinessRoleModel();


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

  // 🔥 Fetch Tenant Admin BusinessRole (pre-seeded per tenant)
  // We need to first create the tenant, then assign the BusinessRole.
  // The createTenantService creates the tenant + membership.
  // We pass businessRoleId as null here, then update after seeding.
  // For demo flow, we use createTenantService which creates tenant + user + membership.
  // The BusinessRole will be assigned after sharedTenantSetup seeds preset BusinessRoles.
  const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
  let result = await createTenantService({
    tenantName: request.companyName,
    email: request.workEmail,
    password: tempPassword,
    businessRoleId: null, // Will be assigned after preset BusinessRoles are seeded
  });

  // 🔥 CREATE SHARED DB DEFAULT DATA (seeds preset BusinessRoles)
  await createSharedTenantSetup({
    tenantId: result.tenant._id,
  });

  // 🔥 SEED PRESET BUSINESS ROLES
  await seedPresetBusinessRoles(result.tenant._id);

  // 🔥 ASSIGN TENANT ADMIN BUSINESS ROLE
  const tenantAdminBusinessRole = await BusinessRole.findOne({
    tenantId: result.tenant._id,
    name: "Tenant Admin",
  });

  if (tenantAdminBusinessRole) {
    const Membership = (await import("../../global/membership/models/membership.model.js")).getMembershipModel();
    await Membership.updateOne(
      { userId: result.user._id, tenantId: result.tenant._id },
      { $set: { businessRoleId: tenantAdminBusinessRole._id } }
    );
  }

  // 🔥 AUTO-ASSIGN PRODUCTS (assign ANAS_KITCHEN to new demo tenant)
  const Product = getProductModel();
  const TenantProduct = getTenantProductModel();
  const anasKitchen = await Product.findOne({ code: "ANAS_KITCHEN" });
  if (anasKitchen) {
    await TenantProduct.findOneAndUpdate(
      { tenantId: result.tenant._id, productId: anasKitchen._id },
      { tenantId: result.tenant._id, productId: anasKitchen._id, isEnabled: true },
      { upsert: true, new: true }
    );

    // 🔥 Also create UserProduct so the context builder returns this product
    const UserProduct = getUserProductModel();
    await UserProduct.findOneAndUpdate(
      { userId: result.user._id, tenantId: result.tenant._id, productId: anasKitchen._id },
      { userId: result.user._id, tenantId: result.tenant._id, productId: anasKitchen._id, isActive: true },
      { upsert: true, new: true }
    );
  }

  // 🔥 PROVISION FOODERP USER
  // 🔥 PROVISION FOODERP FRANCHISE & USER
  const pTenantResult = await provisionFoodERPTenant(result.tenant._id.toString(), request.companyName, request.workEmail);
  if (!pTenantResult) {
    throw new Error("FoodERP Franchise Provisioning failed. Please ensure the FoodERP backend is reachable and healthy.");
  }
  const pUserResult = await provisionFoodERPUser(result.tenant._id.toString(), result.user._id.toString(), request.workEmail, request.fullName, "Tenant Admin");
  if (!pUserResult) {
    throw new Error("FoodERP User Provisioning failed. Please ensure the FoodERP backend is reachable and healthy.");
  }

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

export const deleteDemoRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const DemoRequest = getDemoRequestModel();
  const User = getUserModel();
  const Membership = getMembershipModel();
  const Tenant = getTenantModel();

  // 1. Find the DemoRequest
  const demoRequest = await DemoRequest.findById(id);
  if (!demoRequest) {
    throw new Error("Demo request not found.");
  }

  // 2. Only activated requests have an associated tenant
  if (demoRequest.status !== "activated") {
    throw new Error("Only activated demo requests with an associated tenant can be deleted.");
  }

  // 3. Find user by email (globally unique)
  const user = await User.findOne({ email: demoRequest.workEmail });
  if (!user) {
    // User already deleted by a previous cascade; just clean up the DemoRequest
    await DemoRequest.findByIdAndDelete(id);
    return res.status(200).json({
      status: "success",
      data: { message: "Demo request cleaned up (tenant already deleted)." },
    });
  }

  // 4. Find all active memberships for the user
  const memberships = await Membership.find({ userId: user._id, isActive: true });
  if (memberships.length === 0) {
    // No memberships left � clean up user and demo request
    await User.findByIdAndDelete(user._id);
    await DemoRequest.findByIdAndDelete(id);
    return res.status(200).json({
      status: "success",
      data: { message: "Demo request cleaned up (no tenant found)." },
    });
  }

  // 5. Intersect memberships with DemoRequest companyName to deterministically find the tenant
  const tenantIds = memberships.map(m => m.tenantId);
  const tenant = await Tenant.findOne({ _id: { $in: tenantIds }, name: demoRequest.companyName });
  const tenantId = tenant ? tenant._id : null;
  if (!tenant) {
    // Tenant already deleted — clean up orphaned membership, user, and demo request
    await Membership.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);
    await DemoRequest.findByIdAndDelete(id);
    return res.status(200).json({
      status: "success",
      data: {
        message: "Demo request and orphaned membership cleaned up (tenant already deleted).",
        deletedCompany: demoRequest.companyName,
        deletedEmail: demoRequest.workEmail,
      },
    });
  }

  // 7. Tenant exists — perform full cascade deletion
  const summary = await deleteTenantCascade(tenantId);

  // 8. Delete the DemoRequest record permanently
  await DemoRequest.findByIdAndDelete(id);

  res.status(200).json({
    status: "success",
    data: {
      message: "Demo request and associated tenant deleted successfully.",
      deletedCompany: demoRequest.companyName,
      deletedEmail: demoRequest.workEmail,
      cascade: summary,
    },
  });
});

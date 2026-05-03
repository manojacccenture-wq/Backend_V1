import * as policyService from "../services/policy.service.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler/asyncHandler.js";

/**
 * Controller for IAM Policy Management
 */

export const createPolicy = asyncHandler(async (req, res) => {
  const { name, type, statements } = req.body;
  const tenantId = req.context?.tenantId || null; // 🔥 Get from IAM context
  
  const policy = await policyService.createPolicy({
    name,
    type,
    statements,
    tenantId
  });
  
  res.status(201).json({
    success: true,
    message: "Policy created successfully",
    data: policy
  });
});

export const attachPolicyToRole = asyncHandler(async (req, res) => {
  const { roleId, policyId } = req.body;
  
  if (!roleId || !policyId) {
    return res.status(400).json({
      success: false,
      message: "roleId and policyId are required"
    });
  }

  const assignment = await policyService.attachPolicyToRole(roleId, policyId);
  
  res.status(200).json({
    success: true,
    message: "Policy attached to role successfully",
    data: assignment
  });
});

export const evaluateTest = asyncHandler(async (req, res) => {
  const { roleIds, action, resource } = req.body;
  
  const isAuthorized = await policyService.evaluateAccess(roleIds, action, resource);
  
  res.status(200).json({
    success: true,
    authorized: isAuthorized,
    context: { action, resource }
  });
});

export const getPolicies = asyncHandler(async (req, res) => {
  const tenantId = req.context?.tenantId || null;
  const policies = await policyService.getPolicies(tenantId);
  
  res.status(200).json({
    success: true,
    data: policies
  });
});

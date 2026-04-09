import mongoose from "mongoose";
import { getMembershipModel } from "../../membership/models/membership.model.js";

export const getTenantUsers = async ({
  tenantId,
  page = 1,
  limit = 10,
  search = "",
}) => {

  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenantId");
  }

  
  const Membership = getMembershipModel();

  const skip = (page - 1) * limit;



  const matchStage = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
    isActive: true,
  };



  // 🔍 Aggregation
  const pipeline = [
    { $match: matchStage },

    // 🔗 USER
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              email: 1,
            },
          },
        ],
        as: "user",
      },
    },
    { $unwind: "$user" },

    // 🔗 ROLE
    {
      $lookup: {
        from: "roles",
        localField: "roleId",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              code: 1,
            },
          },
        ],
        as: "role",
      },
    },
    { $unwind: "$role" },

    // 🔍 SEARCH (email)
    ...(search
      ? [
        {
          $match: {
            "user.email": { $regex: search, $options: "i" },
          },
        },
      ]
      : []),

    // 🎯 FINAL SHAPE
    {
      $project: {
        userId: "$user._id",
        email: "$user.email",
        role: "$role.code",
      },
    },

    // 📄 PAGINATION
    { $sort: { email: 1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  // ⚡ parallel queries
  const [data, totalResult] = await Promise.all([
    Membership.aggregate(pipeline),

    Membership.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      ...(search
        ? [
          {
            $match: {
              "user.email": { $regex: search, $options: "i" },
            },
          },
        ]
        : []),
      { $count: "total" },
    ]),
  ]);

  const total = totalResult[0]?.total || 0;

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Worker = require("../models/Worker");
const Order = require("../models/Order");
const Loan = require("../models/Loan");
const Seed = require("../models/Seed");
const Fertilizer = require("../models/Fertilizer");
const asyncHandler = require("../utils/asyncHandler");

const getPlatformStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalEquipment,
    totalWorkers,
    totalOrders,
    totalSeeds,
    totalFertilizers,
    roleBreakdown,
    statusBreakdown,
    paid,
    activeLoans,
    pendingOrders,
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Equipment.countDocuments(),
    Worker.countDocuments(),
    Order.countDocuments(),
    Seed.countDocuments(),
    Fertilizer.countDocuments(),
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: "$paymentMode", total: { $sum: "$totalPrice" }, count: { $sum: 1 } } }]),
    Loan.countDocuments({ loanStatus: { $in: ["active", "approved"] } }),
    Order.countDocuments({ status: "pending" }),
  ]);
  const roleMap = Object.fromEntries(roleBreakdown.map((r) => [r._id, r.count]));
  const pick = (mode) => paid.find((p) => p._id === mode) || { total: 0, count: 0 };

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalFarmers: roleMap.farmer || 0,
      totalWorkers: roleMap.worker || 0,
      totalOwners: roleMap.equipment_owner || 0,
      totalAdmins: roleMap.admin || 0,
      totalEquipment,
      totalSeeds,
      totalFertilizers,
      totalMarketplaceListings: totalEquipment + totalSeeds + totalFertilizers,
      totalOrders,
      totalBookings: totalOrders,
      pendingOrders,
      activeLoans,
      // Verified gateway payments only; simulated test-mode amounts are reported separately.
      totalRevenue: pick("razorpay").total,
      paidOrders: pick("razorpay").count,
      testModeRevenue: pick("test").total,
      roleBreakdown,
      statusBreakdown,
    },
  });
});

const getMonthlyTrends = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setMonth(since.getMonth() - 5, 1);
  since.setHours(0, 0, 0, 0);
  const [userTrends, bookingTrends] = await Promise.all([
    User.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" }, role: "$role" }, count: { $sum: 1 } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }]),
    Order.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, count: { $sum: 1 }, revenue: { $sum: { $cond: [{ $and: [{ $eq: ["$paymentStatus", "paid"] }, { $eq: ["$paymentMode", "razorpay"] }] }, "$totalPrice", 0] } } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }]),
  ]);
  res.status(200).json({ success: true, data: { userTrends, bookingTrends } });
});

module.exports = { getPlatformStats, getMonthlyTrends };

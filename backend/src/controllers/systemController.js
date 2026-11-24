const Equipment = require("../models/Equipment");
const Fertilizer = require("../models/Fertilizer");
const Worker = require("../models/Worker");
const User = require("../models/User");
const { sendCsv } = require("../utils/csv");

const getHowItWorks = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "How it works steps fetched successfully",
    data: [
      { step: 1, title: "Register/Login", description: "Create your AgroLink account and sign in securely." },
      { step: 2, title: "Choose Service", description: "Select worker, equipment, or fertilizer as per your farming needs." },
      { step: 3, title: "Place Order", description: "Submit your order request with schedule and quantity/duration details." },
      { step: 4, title: "Track in My Rentals", description: "Track pending, approved, and completed requests in one place." },
      { step: 5, title: "Complete and Rate", description: "Mark order completion and add feedback for better service quality." },
    ],
  });
};

const getPricing = async (req, res) => {
  try {
    const [workers, equipment, fertilizers] = await Promise.all([
      Worker.find({ availability: true }).populate("userId", "name location"),
      Equipment.find({ availability: true }).populate("ownerId", "name location"),
      Fertilizer.find({ available: true }).populate("seller", "name location"),
    ]);

    const data = {
      workers: workers.map((item) => ({
        id: item._id,
        name: item.userId?.name || "Worker",
        location: item.location || item.userId?.location || "",
        pricing: {
          amount: item.pricing.amount,
          unit: item.pricing.unit,
        },
      })),
      equipment: equipment.map((item) => ({
        id: item._id,
        name: item.name,
        type: item.type || item.category,
        location: item.location,
        pricing: {
          amount: item.pricing?.amount ?? item.price,
          unit: item.pricing?.unit || "day",
        },
      })),
      fertilizers: fertilizers.map((item) => ({
        id: item._id,
        name: item.name,
        type: item.type,
        location: item.location,
        pricing: {
          amount: item.pricing?.amount ?? item.pricePerKg ?? item.price,
          unit: item.pricing?.unit || (item.pricePerBag ? "bag" : "kg"),
        },
      })),
    };

    return res.status(200).json({ success: true, message: "Dynamic pricing fetched successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch dynamic pricing", data: null });
  }
};

const exportUsersCsvForFarmerOrAdmin = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const users = isAdmin
      ? await User.find().select("-password").sort({ createdAt: -1 })
      : await User.find({ _id: req.user._id }).select("-password");

    const rows = users.map((user) => ({
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      location: user.location || "",
      createdAt: user.createdAt?.toISOString(),
    }));

    return sendCsv(res, "users-report.csv", rows);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to export users CSV", data: null });
  }
};

module.exports = {
  getHowItWorks,
  getPricing,
  exportUsersCsvForFarmerOrAdmin,
};

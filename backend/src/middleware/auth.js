const jwt = require("jsonwebtoken");
const User = require("../models/User");

const normalizeRole = (role) => (role === "equipment" ? "equipment_owner" : role);

// Verifies the Bearer token, loads the user fresh from MongoDB (so deactivated accounts and
// password changes take effect immediately) and attaches it as req.user.
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized - no token" });
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      const expired = error.name === "TokenExpiredError";
      return res.status(401).json({
        success: false,
        code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
        message: expired ? "Session expired. Please log in again." : "Invalid token",
      });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, code: "USER_INACTIVE", message: "User not found or inactive" });
    }
    if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ success: false, code: "TOKEN_REVOKED", message: "Session is no longer valid. Please log in again." });
    }

    user.role = normalizeRole(user.role);
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const authorize = (...roles) => (req, res, next) => {
  const userRole = normalizeRole(req.user?.role);
  if (!req.user || !roles.includes(userRole)) {
    return res.status(403).json({ success: false, message: `Role ${userRole || "unknown"} not authorized` });
  }
  return next();
};

module.exports = { protect, authorize, normalizeRole };

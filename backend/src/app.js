const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const buildCorsOptions = () => {
  const configured = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = new Set([...configured, "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173", "http://127.0.0.1:5173"]);
  return {
    origin: (origin, callback) => (!origin || allowed.has(origin) ? callback(null, true) : callback(new Error("Not allowed by CORS"))),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
};

const createApp = () => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  const corsOptions = buildCorsOptions();
  app.use(cors(corsOptions));

  // Razorpay webhooks need the raw bytes for signature verification, so mount before express.json().
  const { webhook } = require("./controllers/paymentController");
  app.post("/api/payments/webhook", express.raw({ type: "application/json", limit: "1mb" }), webhook);

  app.use(express.json({ limit: "1mb" }));

  // Maintenance mode (admin setting): everything except health checks, login and admin traffic returns 503.
  const settings = require("./services/settingsService");
  const jwt = require("jsonwebtoken");
  app.use(async (req, res, next) => {
    try {
      if (req.path === "/api/health" || req.path === "/api/auth/login" || !req.path.startsWith("/api/")) return next();
      if (!(await settings.get("system.maintenanceMode"))) return next();
      const token = (req.headers.authorization || "").replace("Bearer ", "");
      try {
        if (token && jwt.verify(token, process.env.JWT_SECRET)) {
          const User = require("./models/User");
          const u = await User.findById(jwt.decode(token).id).select("role");
          if (u?.role === "admin") return next();
        }
      } catch {
        /* invalid token falls through to the 503 below */
      }
      return res.status(503).json({ success: false, code: "MAINTENANCE", message: "AgroLink is under maintenance. Please try again shortly." });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/health", (req, res) => res.status(200).json({ status: "OK", timestamp: new Date().toISOString() }));

  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/users", require("./routes/userRoutes"));
  app.use("/api/messages", require("./routes/messageRoutes"));
  app.use("/api/notifications", require("./routes/notificationRoutes"));
  app.use("/api/search", require("./routes/searchRoutes"));
  app.use("/api/fertilizers", require("./routes/fertilizerRoutes"));
  app.use("/api/seeds", require("./routes/seedRoutes"));
  app.use("/api/equipment", require("./routes/equipmentRoutes"));
  app.use("/api/bookings", require("./routes/bookingRoutes"));
  app.use("/api/workers", require("./routes/workerRoutes"));
  app.use("/api/orders", require("./routes/orderRoutes"));
  app.use("/api/payments", require("./routes/paymentRoutes"));
  app.use("/api/reviews", require("./routes/reviewRoutes"));
  app.use("/api/admin", require("./routes/adminRoutes"));
  app.use("/api/system", require("./routes/systemRoutes"));
  app.use("/api/meta", require("./routes/metaRoutes"));
  app.use("/api/analytics", require("./routes/analyticsRoutes"));
  app.use("/api/emi", require("./routes/emiRoutes"));
  app.use("/api/ai", require("./routes/aiRoutes"));

  app.use(notFound);
  app.use(errorHandler);
  return { app, corsOptions };
};

module.exports = { createApp };

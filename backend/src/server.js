const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const setupSocket = require("./sockets/socketHandler");
const { createApp } = require("./app");
const { setIO } = require("./utils/io");

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not set in .env file");
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be set to a random string of at least 32 characters");
  process.exit(1);
}
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("⚠️  Razorpay keys not set: payments run in clearly-labelled TEST MODE (no real money).");
}

const start = async () => {
  await connectDB();
  const { app, corsOptions } = createApp();
  const server = http.createServer(app);
  const io = new Server(server, { cors: corsOptions, transports: ["websocket", "polling"] });
  app.set("io", io);
  setIO(io);
  setupSocket(io);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`🌱 AgroLink server running on port ${PORT}`));

  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

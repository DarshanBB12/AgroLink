const notFound = (req, res) => res.status(404).json({ success: false, message: "Route not found" });

// Central error handler: one response shape, no stack traces leaked to clients.
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Server error";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    message = field === "email" ? "Email already registered" : `Duplicate value for ${field}`;
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    message = err.name === "TokenExpiredError" ? "Session expired. Please log in again." : "Invalid token";
  } else if (err.message === "Not allowed by CORS") {
    status = 403;
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON body";
  }

  if (status >= 500) console.error("[error]", req.method, req.originalUrl, err);
  // Unexpected 5xx errors are masked; deliberate ApiErrors (e.g. 502 gateway problems) keep their user-safe message.
  const body = { success: false, message: status >= 500 && !err.isOperational ? "Server error" : message };
  if (err.details) body.errors = err.details;
  return res.status(status).json(body);
};

module.exports = { notFound, errorHandler };

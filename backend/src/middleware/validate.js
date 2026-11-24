const { validationResult } = require("express-validator");

// Returns a consistent 400 payload for express-validator failures.
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const list = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  return res.status(400).json({ success: false, message: list[0].message, errors: list });
};

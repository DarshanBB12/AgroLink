// Wraps async route handlers so rejected promises reach the central error handler
// instead of becoming unhandled rejections.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

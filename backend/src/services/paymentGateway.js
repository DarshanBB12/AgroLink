const crypto = require("crypto");

// Real mode requires BOTH Razorpay keys. Without them the platform runs in clearly labelled test mode
// where no money moves and no payment is ever presented as real.
const isLive = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const getMode = () => (isLive() ? "razorpay" : "test");

// Test-mode confirmations are refused in production unless explicitly enabled.
const testModeAllowed = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_PAYMENTS === "true";

let client = null;
const getClient = () => {
  if (!isLive()) return null;
  if (!client) {
    const Razorpay = require("razorpay");
    client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  }
  return client;
};

// Allows tests to swap the SDK instance without touching the network.
const _setClientForTests = (c) => {
  client = c;
};

const timingSafeEqualHex = (a, b) => {
  const A = Buffer.from(String(a), "utf8");
  const B = Buffer.from(String(b), "utf8");
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

// Razorpay checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
const verifyCheckoutSignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature || !process.env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return timingSafeEqualHex(expected, signature);
};

const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqualHex(expected, signature);
};

module.exports = { isLive, getMode, testModeAllowed, getClient, verifyCheckoutSignature, verifyWebhookSignature, _setClientForTests };

// Legacy /api/bookings endpoints. Bookings and orders are the same record (Order); these thin
// adapters keep older clients working without duplicating any business logic.
const orders = require("./orderController");

const TYPE_MAP = { Equipment: "equipment", Fertilizer: "fertilizer", Worker: "worker", Seed: "seed" };

const createBooking = (req, res, next) => {
  req.body = {
    ...req.body,
    type: req.body.type || TYPE_MAP[req.body.itemType],
    duration: req.body.duration ?? req.body.days,
    notes: req.body.notes ?? req.body.category,
  };
  return orders.createOrder(req, res, next);
};

module.exports = {
  createBooking,
  getMyBookings: orders.getMyOrders,
  getAllBookings: orders.getAllOrders,
  updateBookingStatus: orders.updateOrderStatus,
};

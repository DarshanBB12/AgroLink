const crypto = require("crypto");
const { app, request, connect, disconnect, register, makeAdmin, futureDate } = require("./helpers");
const Transaction = require("../src/models/Transaction");
const Order = require("../src/models/Order");
const gateway = require("../src/services/paymentGateway");

let owner, farmer, admin, equipId, fertId;

beforeAll(async () => {
  await connect("payment");
  admin = await makeAdmin();
  owner = await register("equipment_owner");
  farmer = await register("farmer");
  equipId = (await request(app).post("/api/equipment").set(owner.auth).send({ name: "Pay Tractor", category: "Tractor", price: 1000 })).body.data.id;
  fertId = (await request(app).post("/api/fertilizers").set(owner.auth).send({ name: "Pay Fert", category: "Compost", type: "compost", price: 50, stock: 100, description: "d" })).body.data.id;
});
afterAll(disconnect);

const newApproved = async (f = farmer, offset = 1) => {
  const o = (await request(app).post("/api/orders").set(f.auth).send({ type: "equipment", itemId: equipId, startDate: futureDate(offset), endDate: futureDate(offset + 1) })).body.data;
  await request(app).put(`/api/orders/${o.id}/status`).set(owner.auth).send({ status: "approved" });
  return o;
};

describe("test mode (no Razorpay keys)", () => {
  beforeAll(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    gateway._setClientForTests(null);
  });

  test("config reports test mode with a notice and never leaks secrets", async () => {
    const res = await request(app).get("/api/payments/config").set(farmer.auth);
    expect(res.body.data.mode).toBe("test");
    expect(res.body.data.keyId).toBeNull();
    expect(res.body.data.testModeNotice).toMatch(/no real money/i);
  });

  test("cannot pay for a rental that is still pending approval", async () => {
    const o = (await request(app).post("/api/orders").set(farmer.auth).send({ type: "equipment", itemId: equipId, startDate: futureDate(100) })).body.data;
    const res = await request(app).post(`/api/payments/orders/${o.id}/create`).set(farmer.auth);
    expect(res.status).toBe(409);
  });

  test("full flow: create -> confirm labelled TEST -> order paid -> receipt; duplicates prevented", async () => {
    const o = await newApproved(farmer, 1);
    const create = await request(app).post(`/api/payments/orders/${o.id}/create`).set(farmer.auth);
    expect(create.status).toBe(201);
    const t = create.body.data.transaction;
    expect(t.status).toBe("created");
    expect(t.isTest).toBe(true);
    expect(t.amount).toBe(o.totalPrice);
    expect(t.transactionRef).toMatch(/^AGL-/);
    expect(create.body.data.checkout.keyId).toBeNull();

    // Reusing the unfinished transaction instead of creating a second one
    const again = await request(app).post(`/api/payments/orders/${o.id}/create`).set(farmer.auth);
    expect(again.body.data.transaction.id).toBe(t.id);
    expect(await Transaction.countDocuments({ relatedId: o.id })).toBe(1);

    // Order is NOT paid before confirmation
    expect((await request(app).get(`/api/orders/${o.id}`).set(farmer.auth)).body.data.paymentStatus).toBe("unpaid");

    const ok = await request(app).post(`/api/payments/${t.id}/test-confirm`).set(farmer.auth).send({ outcome: "success" });
    expect(ok.status).toBe(200);
    expect(ok.body.message).toMatch(/TEST payment/);
    expect(ok.body.data.status).toBe("completed");
    expect(ok.body.data.isTest).toBe(true);
    expect(ok.body.data.receiptNo).toMatch(/^RCPT-/);

    const paid = (await request(app).get(`/api/orders/${o.id}`).set(farmer.auth)).body.data;
    expect(paid.paymentStatus).toBe("paid");
    expect(paid.paymentMode).toBe("test");

    // second confirm is idempotent, and a new payment for a paid order is refused
    expect((await request(app).post(`/api/payments/${t.id}/test-confirm`).set(farmer.auth).send({ outcome: "success" })).body.duplicate).toBe(true);
    expect((await request(app).post(`/api/payments/orders/${o.id}/create`).set(farmer.auth)).status).toBe(409);
    expect(await Transaction.countDocuments({ relatedId: o.id, status: "completed" })).toBe(1);

    // history, details, provider/farmer notifications
    const hist = await request(app).get("/api/payments/my").set(farmer.auth);
    expect(hist.body.data.some((x) => x.id === t.id)).toBe(true);
    expect(hist.body.summary.testModePaid).toBeGreaterThan(0);
    expect(hist.body.summary.paid).toBe(0); // test payments never count as real money
    expect((await request(app).get(`/api/payments/${t.id}`).set(farmer.auth)).body.data.order.itemName).toBe("Pay Tractor");
    expect((await request(app).get("/api/notifications").set(owner.auth)).body.notifications.some((n) => /payment received/i.test(n.title) && /TEST/.test(n.message))).toBe(true);
  });

  test("failure and cancellation do not mark the order paid and the payment can be retried", async () => {
    const o = await newApproved(farmer, 10);
    const t1 = (await request(app).post(`/api/payments/orders/${o.id}/create`).set(farmer.auth)).body.data.transaction;
    const fail = await request(app).post(`/api/payments/${t1.id}/test-confirm`).set(farmer.auth).send({ outcome: "failure" });
    expect(fail.body.data.status).toBe("failed");
    expect((await request(app).get(`/api/orders/${o.id}`).set(farmer.auth)).body.data.paymentStatus).toBe("unpaid");
    const t2 = (await request(app).post(`/api/payments/orders/${o.id}/create`).set(farmer.auth)).body.data.transaction;
    expect(t2.id).not.toBe(t1.id);
    const cancel = await request(app).post(`/api/payments/${t2.id}/test-confirm`).set(farmer.auth).send({ outcome: "cancel" });
    expect(cancel.body.data.status).toBe("cancelled");
    expect((await request(app).post(`/api/payments/${t2.id}/fail`).set(farmer.auth).send({ cancelled: true })).status).toBe(200);
  });

  test("another farmer cannot create, confirm or read someone else's payment", async () => {
    const o = await newApproved(farmer, 20);
    const t = (await request(app).post(`/api/payments/orders/${o.id}/create`).set(farmer.auth)).body.data.transaction;
    const intruder = await register("farmer");
    expect((await request(app).post(`/api/payments/orders/${o.id}/create`).set(intruder.auth)).status).toBe(404);
    expect((await request(app).post(`/api/payments/${t.id}/test-confirm`).set(intruder.auth).send({ outcome: "success" })).status).toBe(404);
    expect((await request(app).get(`/api/payments/${t.id}`).set(intruder.auth)).status).toBe(404);
    expect((await request(app).get(`/api/payments/${t.id}/invoice`).set(intruder.auth)).status).toBe(404);
    expect((await request(app).get(`/api/payments/${t.id}`).set(owner.auth)).status).toBe(200); // the provider may view
  });

  test("a client can never mark a payment successful through the failure endpoint", async () => {
    const o = await newApproved(farmer, 30);
    const t = (await request(app).post(`/api/payments/orders/${o.id}/create`).set(farmer.auth)).body.data.transaction;
    await request(app).post(`/api/payments/${t.id}/test-confirm`).set(farmer.auth).send({ outcome: "success" });
    expect((await request(app).post(`/api/payments/${t.id}/fail`).set(farmer.auth).send({ reason: "x" })).status).toBe(409);
  });

  test("fertilizer purchases are payable immediately and PDF invoices download", async () => {
    const buy = (await request(app).post("/api/orders").set(farmer.auth).send({ type: "fertilizer", itemId: fertId, quantity: 3 })).body.data;
    expect(buy.totalPrice).toBe(150);
    const t = (await request(app).post(`/api/payments/orders/${buy.id}/create`).set(farmer.auth)).body.data.transaction;
    expect((await request(app).get(`/api/payments/${t.id}/invoice`).set(farmer.auth)).status).toBe(409); // not paid yet
    await request(app).post(`/api/payments/${t.id}/test-confirm`).set(farmer.auth).send({ outcome: "success" });
    const inv = await request(app).get(`/api/payments/${t.id}/invoice`).set(farmer.auth).buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(inv.status).toBe(200);
    expect(inv.headers["content-type"]).toMatch(/pdf/);
    expect(inv.headers["content-disposition"]).toMatch(/attachment/);
    expect(inv.body.slice(0, 4).toString()).toBe("%PDF");
    // product orders can now be completed by the seller
    expect((await request(app).put(`/api/orders/${buy.id}/status`).set(owner.auth).send({ status: "completed" })).body.data.status).toBe("completed");
  });

  test("paid orders cannot be cancelled by the farmer; admin cancel marks refund", async () => {
    const o = await newApproved(farmer, 40);
    const t = (await request(app).post(`/api/payments/orders/${o.id}/create`).set(farmer.auth)).body.data.transaction;
    await request(app).post(`/api/payments/${t.id}/test-confirm`).set(farmer.auth).send({ outcome: "success" });
    expect((await request(app).put(`/api/orders/${o.id}/status`).set(farmer.auth).send({ status: "cancelled" })).status).toBe(400);
    const adminCancel = await request(app).put(`/api/orders/${o.id}/status`).set(admin.auth).send({ status: "cancelled", reason: "Dispute" });
    expect(adminCancel.body.data.paymentStatus).toBe("refunded");
    expect((await Transaction.findById(t.id)).status).toBe("refunded");
  });

  test("provider earnings separate test-mode money from verified money", async () => {
    const e = await request(app).get("/api/orders/earnings").set(owner.auth);
    expect(e.body.data.gross).toBe(0);
    expect(e.body.data.testModeAmount).toBeGreaterThan(0);
    const rec = await request(app).get("/api/payments/received").set(owner.auth);
    expect(rec.body.data.length).toBeGreaterThan(0);
  });
});

describe("live mode (Razorpay, SDK mocked)", () => {
  const SECRET = "rzp_test_secret_value";
  let fakeRazorpay;
  const payments = {};

  beforeAll(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = SECRET;
    fakeRazorpay = {
      orders: { create: jest.fn(async ({ amount }) => ({ id: `order_${crypto.randomBytes(5).toString("hex")}`, amount })) },
      payments: { fetch: jest.fn(async (id) => payments[id]) },
    };
    gateway._setClientForTests(fakeRazorpay);
  });
  afterAll(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    gateway._setClientForTests(null);
  });

  const sign = (orderId, paymentId) => crypto.createHmac("sha256", SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  const start = async (offset) => {
    const o = await newApproved(farmer, offset);
    const res = await request(app).post(`/api/payments/orders/${o.id}/create`).set(farmer.auth);
    return { o, t: res.body.data.transaction, checkout: res.body.data.checkout, res };
  };

  test("creates a gateway order for the DB amount in paise and exposes only the public key id", async () => {
    const { o, checkout, res } = await start(200);
    expect(res.body.data.transaction.isTest).toBe(false);
    expect(fakeRazorpay.orders.create).toHaveBeenCalledWith(expect.objectContaining({ amount: Math.round(o.totalPrice * 100), currency: "INR" }));
    expect(checkout.keyId).toBe("rzp_test_key");
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
    const cfg = await request(app).get("/api/payments/config").set(farmer.auth);
    expect(cfg.body.data.mode).toBe("razorpay");
    expect(JSON.stringify(cfg.body)).not.toContain(SECRET);
  });

  test("test-confirm is refused while live keys are configured", async () => {
    const { t } = await start(210);
    expect((await request(app).post(`/api/payments/${t.id}/test-confirm`).set(farmer.auth).send({ outcome: "success" })).status).toBe(400);
  });

  test("valid signature + matching gateway payment => completed, order paid, idempotent on repeat", async () => {
    const { o, t, checkout } = await start(220);
    const paymentId = "pay_ok123";
    payments[paymentId] = { id: paymentId, order_id: checkout.razorpayOrderId, amount: Math.round(o.totalPrice * 100), status: "captured" };
    const body = { transactionId: t.id, razorpay_order_id: checkout.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: sign(checkout.razorpayOrderId, paymentId) };
    const res = await request(app).post("/api/payments/verify").set(farmer.auth).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("completed");
    expect(res.body.data.isTest).toBe(false);
    const order = (await request(app).get(`/api/orders/${o.id}`).set(farmer.auth)).body.data;
    expect(order.paymentStatus).toBe("paid");
    expect(order.paymentMode).toBe("razorpay");

    const repeat = await request(app).post("/api/payments/verify").set(farmer.auth).send(body);
    expect(repeat.status).toBe(200);
    expect(repeat.body.duplicate).toBe(true);
    expect(await Transaction.countDocuments({ relatedId: o.id, status: "completed" })).toBe(1);
    expect((await request(app).get("/api/orders/earnings").set(owner.auth)).body.data.gross).toBeGreaterThanOrEqual(o.totalPrice);
  });

  test("invalid signature is rejected, marks the attempt failed and never pays the order", async () => {
    const { o, t, checkout } = await start(230);
    const res = await request(app).post("/api/payments/verify").set(farmer.auth).send({ transactionId: t.id, razorpay_order_id: checkout.razorpayOrderId, razorpay_payment_id: "pay_forged", razorpay_signature: "deadbeef".repeat(8) });
    expect(res.status).toBe(400);
    expect((await Transaction.findById(t.id)).status).toBe("failed");
    expect((await Order.findById(o.id)).paymentStatus).toBe("unpaid");
  });

  test("a correct signature with a different amount at the gateway is rejected", async () => {
    const { o, t, checkout } = await start(240);
    const paymentId = "pay_short";
    payments[paymentId] = { id: paymentId, order_id: checkout.razorpayOrderId, amount: 100, status: "captured" };
    const res = await request(app).post("/api/payments/verify").set(farmer.auth).send({ transactionId: t.id, razorpay_order_id: checkout.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: sign(checkout.razorpayOrderId, paymentId) });
    expect(res.status).toBe(400);
    expect((await Order.findById(o.id)).paymentStatus).toBe("unpaid");
  });

  test("a signature for a different order id is rejected", async () => {
    const { t } = await start(250);
    const res = await request(app).post("/api/payments/verify").set(farmer.auth).send({ transactionId: t.id, razorpay_order_id: "order_other", razorpay_payment_id: "pay_x", razorpay_signature: sign("order_other", "pay_x") });
    expect(res.status).toBe(400);
  });

  test("gateway outage while confirming does not mark the payment successful", async () => {
    const { o, t, checkout } = await start(260);
    fakeRazorpay.payments.fetch.mockRejectedValueOnce(new Error("network"));
    const res = await request(app).post("/api/payments/verify").set(farmer.auth).send({ transactionId: t.id, razorpay_order_id: checkout.razorpayOrderId, razorpay_payment_id: "pay_net", razorpay_signature: sign(checkout.razorpayOrderId, "pay_net") });
    expect(res.status).toBe(502);
    expect((await Order.findById(o.id)).paymentStatus).toBe("unpaid");
  });

  test("gateway failure creating the order returns 502 and records nothing", async () => {
    const o = await newApproved(farmer, 270);
    fakeRazorpay.orders.create.mockRejectedValueOnce(new Error("down"));
    const res = await request(app).post(`/api/payments/orders/${o.id}/create`).set(farmer.auth);
    expect(res.status).toBe(502);
    expect(await Transaction.countDocuments({ relatedId: o.id })).toBe(0);
  });

  test("webhook: valid signature confirms a payment the browser never reported; bad signature is refused", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
    const { o, t, checkout } = await start(280);
    const event = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_wh1", order_id: checkout.razorpayOrderId, amount: Math.round(o.totalPrice * 100) } } } });
    const bad = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("x-razorpay-signature", "nope").send(event);
    expect(bad.status).toBe(400);
    const good = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").set("x-razorpay-signature", crypto.createHmac("sha256", "whsec_test").update(event).digest("hex")).send(event);
    expect(good.status).toBe(200);
    expect((await Transaction.findById(t.id)).status).toBe("completed");
    expect((await Order.findById(o.id)).paymentStatus).toBe("paid");
  });

  test("admin: list/filter, refund, export", async () => {
    const all = await request(app).get("/api/payments/admin/all?limit=50").set(admin.auth);
    expect(all.body.data.length).toBeGreaterThan(3);
    expect(all.body.summary.completed.count).toBeGreaterThan(0);
    expect(all.body.summary.testMode.count).toBeGreaterThan(0);
    const failed = await request(app).get("/api/payments/admin/all?status=failed").set(admin.auth);
    expect(failed.body.data.every((x) => x.status === "failed")).toBe(true);
    const live = await request(app).get("/api/payments/admin/all?mode=razorpay&status=completed").set(admin.auth);
    const target = live.body.data[0];
    const refund = await request(app).put(`/api/payments/admin/${target.id}/refund`).set(admin.auth).send({ reason: "Customer request" });
    expect(refund.body.data.status).toBe("refunded");
    expect((await Order.findById(target.relatedId)).paymentStatus).toBe("refunded");
    expect((await request(app).put(`/api/payments/admin/${target.id}/refund`).set(admin.auth)).status).toBe(409);
    const csv = await request(app).get("/api/payments/admin/export").set(admin.auth);
    expect(csv.headers["content-type"]).toMatch(/csv/);
    expect(csv.text).toContain("transactionRef");
    expect((await request(app).get("/api/payments/admin/all").set(farmer.auth)).status).toBe(403);
  });
});

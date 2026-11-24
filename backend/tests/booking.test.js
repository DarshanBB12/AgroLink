const { app, request, connect, disconnect, register, makeAdmin, futureDate } = require("./helpers");
const Fertilizer = require("../src/models/Fertilizer");
const Notification = require("../src/models/Notification");

let owner, farmer, farmer2, worker, equipId, workerItemId, fertId, admin;
beforeAll(async () => {
  await connect("booking");
  admin = await makeAdmin();
  owner = await register("equipment_owner");
  farmer = await register("farmer");
  farmer2 = await register("farmer");
  worker = await register("worker");
  equipId = (await request(app).post("/api/equipment").set(owner.auth).send({ name: "Rotavator", category: "Tillage", price: 1500, discount: 10, location: "Pune" })).body.data.id;
  workerItemId = (await request(app).put("/api/workers/me").set(worker.auth).send({ skills: ["Harvesting"], pricing: { amount: 600, unit: "day" } })).body.data.id;
  fertId = (await request(app).post("/api/fertilizers").set(owner.auth).send({ name: "Vermicompost", category: "Compost", type: "compost", price: 20, stock: 10, description: "Rich compost", unit: "kg" })).body.data.id;
});
afterAll(disconnect);

const order = (auth, body) => request(app).post("/api/orders").set(auth).send(body);

test("rental price is calculated on the server (days x rate - discount); client price is ignored", async () => {
  const res = await order(farmer.auth, { type: "equipment", itemId: equipId, startDate: futureDate(2), endDate: futureDate(4), price: 1, totalPrice: 1 });
  expect(res.status).toBe(201);
  expect(res.body.data.duration).toBe(3);
  expect(res.body.data.totalPrice).toBe(4050); // 1500*3*0.9
  expect(res.body.data.status).toBe("pending");
  expect(res.body.data.paymentStatus).toBe("unpaid");
});

test("rejects invalid dates, unknown ids and own listings", async () => {
  expect((await order(farmer.auth, { type: "equipment", itemId: equipId, startDate: "2020-01-01" })).status).toBe(400);
  expect((await order(farmer.auth, { type: "equipment", itemId: equipId, startDate: futureDate(5), endDate: futureDate(3) })).status).toBe(400);
  expect((await order(farmer.auth, { type: "equipment", itemId: equipId })).status).toBe(400);
  expect((await order(farmer.auth, { type: "equipment", itemId: "507f1f77bcf86cd799439011", startDate: futureDate(5) })).status).toBe(404);
  expect((await order(farmer.auth, { type: "equipment", itemId: "bad", startDate: futureDate(5) })).status).toBe(400);
  expect((await order(owner.auth, { type: "equipment", itemId: equipId, startDate: futureDate(5) })).status).toBe(403); // owners cannot rent
  expect((await order(farmer.auth, { type: "equipment", itemId: equipId, startDate: futureDate(5), endDate: futureDate(500) })).status).toBe(400); // max days
});

test("duplicate pending requests for the same dates are blocked", async () => {
  const res = await order(farmer.auth, { type: "equipment", itemId: equipId, startDate: futureDate(3), endDate: futureDate(3) });
  expect(res.status).toBe(409);
});

test("double booking is prevented once a rental is approved", async () => {
  const mine = (await request(app).get("/api/orders/my").set(farmer.auth)).body.data;
  const first = mine.find((o) => o.itemId === equipId);
  const ok = await request(app).put(`/api/orders/${first.id}/status`).set(owner.auth).send({ status: "approved" });
  expect(ok.status).toBe(200);
  expect(ok.body.data.status).toBe("approved");

  const clash = await order(farmer2.auth, { type: "equipment", itemId: equipId, startDate: futureDate(4), endDate: futureDate(6) });
  expect(clash.status).toBe(409);
  expect(clash.body.message).toMatch(/already booked/i);
  const free = await order(farmer2.auth, { type: "equipment", itemId: equipId, startDate: futureDate(5), endDate: futureDate(6) });
  expect(free.status).toBe(201); // days 2..4 are booked; day 5 onwards is free
});

test("approving overlapping pending requests is rejected", async () => {
  const eq = (await request(app).post("/api/equipment").set(owner.auth).send({ name: "Overlap Tractor", category: "Tractor", price: 1000 })).body.data.id;
  const a = await order(farmer.auth, { type: "equipment", itemId: eq, startDate: futureDate(20), endDate: futureDate(22) });
  const b = await order(farmer2.auth, { type: "equipment", itemId: eq, startDate: futureDate(21), endDate: futureDate(23) });
  expect(a.status).toBe(201);
  expect(b.status).toBe(201);
  expect((await request(app).put(`/api/orders/${a.body.data.id}/status`).set(owner.auth).send({ status: "approved" })).status).toBe(200);
  const second = await request(app).put(`/api/orders/${b.body.data.id}/status`).set(owner.auth).send({ status: "approved" });
  expect(second.status).toBe(409);
});

test("status transitions are enforced per role", async () => {
  const eq = (await request(app).post("/api/equipment").set(owner.auth).send({ name: "T3", category: "Tractor", price: 1000 })).body.data.id;
  const o = (await order(farmer.auth, { type: "equipment", itemId: eq, startDate: futureDate(30) })).body.data;
  expect((await request(app).put(`/api/orders/${o.id}/status`).set(farmer.auth).send({ status: "approved" })).status).toBe(400); // farmer cannot approve
  expect((await request(app).put(`/api/orders/${o.id}/status`).set(owner.auth).send({ status: "completed" })).status).toBe(400); // must approve first
  const rej = await request(app).put(`/api/orders/${o.id}/status`).set(owner.auth).send({ status: "rejected", reason: "Under maintenance" });
  expect(rej.body.data.status).toBe("rejected");
  expect(rej.body.data.cancelReason).toBe("Under maintenance");
  expect((await request(app).put(`/api/orders/${o.id}/status`).set(owner.auth).send({ status: "approved" })).status).toBe(400); // final state
  expect((await request(app).put(`/api/orders/${o.id}/status`).set(owner.auth).send({ status: "nonsense" })).status).toBe(400);
});

test("farmer can cancel a pending request; provider is notified", async () => {
  const eq = (await request(app).post("/api/equipment").set(owner.auth).send({ name: "T4", category: "Tractor", price: 1000 })).body.data.id;
  const o = (await order(farmer.auth, { type: "equipment", itemId: eq, startDate: futureDate(40) })).body.data;
  const res = await request(app).put(`/api/orders/${o.id}/status`).set(farmer.auth).send({ status: "cancelled" });
  expect(res.body.data.status).toBe("cancelled");
  const notifs = await request(app).get("/api/notifications").set(owner.auth);
  expect(notifs.body.notifications.some((n) => /cancelled/i.test(n.title))).toBe(true);
});

test("notifications are created for new request, approval and rejection", async () => {
  const farmerNotifs = (await request(app).get("/api/notifications").set(farmer.auth)).body.notifications;
  expect(farmerNotifs.some((n) => /request submitted/i.test(n.title))).toBe(true);
  expect(farmerNotifs.some((n) => /approved/i.test(n.title))).toBe(true);
  expect(farmerNotifs.some((n) => /rejected/i.test(n.title))).toBe(true);
  const ownerNotifs = (await request(app).get("/api/notifications").set(owner.auth)).body.notifications;
  expect(ownerNotifs.some((n) => /new rental request/i.test(n.title))).toBe(true);
});

test("notification read / mark-all / delete", async () => {
  let list = (await request(app).get("/api/notifications").set(farmer.auth)).body;
  expect(list.unreadCount).toBeGreaterThan(0);
  const first = list.notifications[0]._id;
  await request(app).put(`/api/notifications/${first}/read`).set(farmer.auth);
  expect((await request(app).get("/api/notifications/unread-count").set(farmer.auth)).body.count).toBe(list.unreadCount - 1);
  await request(app).put("/api/notifications/read-all").set(farmer.auth);
  expect((await request(app).get("/api/notifications/unread-count").set(farmer.auth)).body.count).toBe(0);
  expect((await request(app).delete(`/api/notifications/${first}`).set(farmer.auth)).status).toBe(200);
  list = (await request(app).get("/api/notifications").set(farmer.auth)).body;
  expect(list.notifications.find((n) => n._id === first)).toBeUndefined();
});

test("notification preferences suppress non-critical notifications", async () => {
  const f = await register("farmer");
  const s = await request(app).put("/api/auth/settings").set(f.auth).send({ notifications: { booking: false } });
  expect(s.body.user.settings.notifications.booking).toBe(false);
  const eq = (await request(app).post("/api/equipment").set(owner.auth).send({ name: "Pref T", category: "Tractor", price: 1000 })).body.data.id;
  await order(f.auth, { type: "equipment", itemId: eq, startDate: futureDate(50) });
  expect((await request(app).get("/api/notifications").set(f.auth)).body.notifications).toEqual([]);
});

test("worker hire: pricing, plan limit (free = 3/month) and job status", async () => {
  const f = await register("farmer");
  const hire = await order(f.auth, { type: "worker", itemId: workerItemId, startDate: futureDate(60), endDate: futureDate(61) });
  expect(hire.status).toBe(201);
  expect(hire.body.data.totalPrice).toBe(1200);
  const jobs = await request(app).get("/api/orders/provider").set(worker.auth);
  expect(jobs.body.data.some((j) => j.id === hire.body.data.id)).toBe(true);
  expect((await request(app).put(`/api/orders/${hire.body.data.id}/status`).set(worker.auth).send({ status: "approved" })).body.data.status).toBe("approved");
  expect((await request(app).put(`/api/orders/${hire.body.data.id}/status`).set(worker.auth).send({ status: "completed" })).body.data.status).toBe("completed");
  await order(f.auth, { type: "worker", itemId: workerItemId, startDate: futureDate(70) });
  await order(f.auth, { type: "worker", itemId: workerItemId, startDate: futureDate(72) });
  const fourth = await order(f.auth, { type: "worker", itemId: workerItemId, startDate: futureDate(75) });
  expect(fourth.status).toBe(403);
  expect(fourth.body.message).toMatch(/limit/i);
});

test("fertilizer purchase: stock is reserved atomically and restored on cancel", async () => {
  const f = await register("farmer");
  const buy = await order(f.auth, { type: "fertilizer", itemId: fertId, quantity: 4 });
  expect(buy.status).toBe(201);
  expect(buy.body.data.totalPrice).toBe(80);
  expect(buy.body.data.status).toBe("approved");
  expect((await Fertilizer.findById(fertId)).stock).toBe(6);
  expect((await order(f.auth, { type: "fertilizer", itemId: fertId, quantity: 7 })).status).toBe(409);
  expect((await order(f.auth, { type: "fertilizer", itemId: fertId, quantity: 0 })).status).toBe(400);
  expect((await order(f.auth, { type: "fertilizer", itemId: fertId, quantity: 1.5 })).status).toBe(400);
  await request(app).put(`/api/orders/${buy.body.data.id}/status`).set(f.auth).send({ status: "cancelled" });
  expect((await Fertilizer.findById(fertId)).stock).toBe(10);
});

test("concurrent purchases cannot oversell stock", async () => {
  const f1 = await register("farmer");
  const f2 = await register("farmer");
  const f3 = await register("farmer");
  const id = (await request(app).post("/api/fertilizers").set(owner.auth).send({ name: "Limited Lot", category: "Compost", type: "compost", price: 10, stock: 5, description: "d" })).body.data.id;
  const results = await Promise.all([f1, f2, f3].map((f) => order(f.auth, { type: "fertilizer", itemId: id, quantity: 2 })));
  expect(results.filter((r) => r.status === 201)).toHaveLength(2);
  expect((await Fertilizer.findById(id)).stock).toBe(1);
});

test("provider order lists are scoped to the provider; admin sees all with filters + pagination", async () => {
  const other = await register("equipment_owner");
  expect((await request(app).get("/api/orders/provider").set(other.auth)).body.data).toEqual([]);
  const all = await request(app).get("/api/orders?limit=3&page=1").set(admin.auth);
  expect(all.body.data.length).toBeLessThanOrEqual(3);
  expect(all.body.pagination.total).toBeGreaterThan(3);
  const pending = await request(app).get("/api/orders?status=pending").set(admin.auth);
  expect(pending.body.data.every((o) => o.status === "pending")).toBe(true);
  const byFarmer = await request(app).get(`/api/orders?q=${encodeURIComponent(farmer.user.name)}`).set(admin.auth);
  expect(byFarmer.body.data.length).toBeGreaterThan(0);
});

test("reviews: only for completed orders, once, and update the item rating", async () => {
  const f = await register("farmer");
  const o = (await order(f.auth, { type: "worker", itemId: workerItemId, startDate: futureDate(90) })).body.data;
  expect((await request(app).post("/api/reviews").set(f.auth).send({ orderId: o.id, rating: 5 })).status).toBe(409);
  await request(app).put(`/api/orders/${o.id}/status`).set(worker.auth).send({ status: "approved" });
  await request(app).put(`/api/orders/${o.id}/status`).set(worker.auth).send({ status: "completed" });
  expect((await request(app).post("/api/reviews").set(f.auth).send({ orderId: o.id, rating: 9 })).status).toBe(400);
  expect((await request(app).post("/api/reviews").set(f.auth).send({ orderId: o.id, rating: 4, comment: "Good" })).status).toBe(201);
  expect((await request(app).post("/api/reviews").set(f.auth).send({ orderId: o.id, rating: 4 })).status).toBe(409);
  const got = await request(app).get("/api/reviews/received").set(worker.auth);
  expect(got.body.summary.count).toBe(1);
  expect(got.body.summary.average).toBe(4);
  expect((await Notification.countDocuments({ userId: worker.user.id, title: /review/i }))).toBe(1);
});

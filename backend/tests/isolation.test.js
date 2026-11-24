const { app, request, connect, disconnect, register, makeAdmin, futureDate } = require("./helpers");
const Equipment = require("../src/models/Equipment");

let owner, farmerA, farmerB, equipId;

beforeAll(async () => {
  await connect("isolation");
  owner = await register("equipment_owner");
  farmerA = await register("farmer");
  farmerB = await register("farmer");
  const eq = await request(app).post("/api/equipment").set(owner.auth).send({ name: "Test Tractor", category: "Tractor", price: 1000, location: "Pune" });
  equipId = eq.body.data.id;
});
afterAll(disconnect);

test("a brand-new account starts completely empty", async () => {
  const fresh = await register("farmer");
  const [orders, notifs, pays, convs, unread] = await Promise.all([
    request(app).get("/api/orders/my").set(fresh.auth),
    request(app).get("/api/notifications").set(fresh.auth),
    request(app).get("/api/payments/my").set(fresh.auth),
    request(app).get("/api/messages/conversations").set(fresh.auth),
    request(app).get("/api/messages/unread-count").set(fresh.auth),
  ]);
  expect(orders.body.data).toEqual([]);
  expect(notifs.body.notifications).toEqual([]);
  expect(pays.body.data).toEqual([]);
  expect(convs.body.data).toEqual([]);
  expect(unread.body.count).toBe(0);
});

test("registering a new user does not delete shared marketplace data or other users' records", async () => {
  const order = await request(app).post("/api/orders").set(farmerA.auth).send({ type: "equipment", itemId: equipId, startDate: futureDate(2), endDate: futureDate(3) });
  expect(order.status).toBe(201);
  await register("farmer"); // new signup
  expect(await Equipment.countDocuments()).toBe(1);
  const mine = await request(app).get("/api/orders/my").set(farmerA.auth);
  expect(mine.body.data).toHaveLength(1);
});

test("farmer B cannot see or touch farmer A's orders", async () => {
  const mineB = await request(app).get("/api/orders/my").set(farmerB.auth);
  expect(mineB.body.data).toEqual([]);
  const aOrders = await request(app).get("/api/orders/my").set(farmerA.auth);
  const id = aOrders.body.data[0].id;
  expect((await request(app).get(`/api/orders/${id}`).set(farmerB.auth)).status).toBe(404);
  expect((await request(app).put(`/api/orders/${id}/status`).set(farmerB.auth).send({ status: "cancelled" })).status).toBe(404);
  expect((await request(app).get(`/api/orders/${id}`).set(farmerA.auth)).status).toBe(200);
});

test("notifications are private; marking/deleting another user's notification fails", async () => {
  const a = await request(app).get("/api/notifications").set(farmerA.auth);
  expect(a.body.notifications.length).toBeGreaterThan(0);
  const nid = a.body.notifications[0]._id;
  const b = await request(app).get("/api/notifications").set(farmerB.auth);
  expect(b.body.notifications).toEqual([]);
  expect((await request(app).put(`/api/notifications/${nid}/read`).set(farmerB.auth)).status).toBe(404);
  expect((await request(app).delete(`/api/notifications/${nid}`).set(farmerB.auth)).status).toBe(404);
  expect((await request(app).put(`/api/notifications/${nid}/read`).set(farmerA.auth)).status).toBe(200);
});

test("chat: only participants can read a conversation and users cannot spoof the sender", async () => {
  const sent = await request(app).post("/api/messages/send").set(farmerA.auth).send({ receiverId: owner.user.id, message: "Is the tractor free?", senderId: farmerB.user.id });
  expect(sent.status).toBe(201);
  expect(String(sent.body.message.senderId._id)).toBe(farmerA.user.id);

  const asOwner = await request(app).get(`/api/messages/${farmerA.user.id}`).set(owner.auth);
  expect(asOwner.body.messages).toHaveLength(1);
  // farmer B asking for A<->owner thread only ever sees B<->A (nothing)
  const asB = await request(app).get(`/api/messages/${farmerA.user.id}`).set(farmerB.auth);
  expect(asB.body.messages).toEqual([]);
  const asB2 = await request(app).get(`/api/messages/${owner.user.id}`).set(farmerB.auth);
  expect(asB2.body.messages).toEqual([]);

  expect((await request(app).post("/api/messages/send").set(farmerA.auth).send({ receiverId: "507f1f77bcf86cd799439011", message: "hi" })).status).toBe(404);
  expect((await request(app).post("/api/messages/send").set(farmerA.auth).send({ receiverId: farmerA.user.id, message: "me" })).status).toBe(400);
  expect((await request(app).post("/api/messages/send").set(farmerA.auth).send({ receiverId: owner.user.id, message: "x".repeat(2001) })).status).toBe(400);
});

test("other users' profiles expose only public fields", async () => {
  const res = await request(app).get(`/api/users/${farmerA.user.id}`).set(farmerB.auth);
  expect(res.status).toBe(200);
  expect(res.body.user.email).toBeUndefined();
  expect(res.body.user.phone).toBeUndefined();
  expect(res.body.user.coordinates).toBeUndefined();
  const list = await request(app).get("/api/users/chat/all").set(farmerB.auth);
  expect(list.body.users.every((u) => u.email === undefined && u.phone === undefined)).toBe(true);
  const self = await request(app).get(`/api/users/${farmerB.user.id}`).set(farmerB.auth);
  expect(self.body.user.email).toBe(farmerB.email);
});

test("provider sees farmer contact only after approval", async () => {
  const farmerC = await register("farmer", { phone: "+91 98765 43210" });
  const o = await request(app).post("/api/orders").set(farmerC.auth).send({ type: "equipment", itemId: equipId, startDate: futureDate(10), endDate: futureDate(10) });
  const before = await request(app).get(`/api/orders/${o.body.data.id}`).set(owner.auth);
  expect(before.body.data.farmer.phone).toBeUndefined();
  await request(app).put(`/api/orders/${o.body.data.id}/status`).set(owner.auth).send({ status: "approved" });
  const after = await request(app).get(`/api/orders/${o.body.data.id}`).set(owner.auth);
  expect(after.body.data.farmer.phone).toBe("+91 98765 43210");
});

test("private location coordinates are never exposed to others", async () => {
  await request(app).put("/api/auth/location").set(farmerA.auth).send({ lat: 18.52, lng: 73.85, address: "Pune", source: "gps" });
  const other = await request(app).get(`/api/users/${farmerA.user.id}`).set(farmerB.auth);
  expect(JSON.stringify(other.body)).not.toMatch(/18\.52|73\.85/);
  const me = await request(app).get("/api/auth/me").set(farmerA.auth);
  expect(me.body.user.coordinates).toEqual({ lat: 18.52, lng: 73.85 });
});

test("admin endpoints stay admin-only", async () => {
  for (const url of ["/api/admin/users", "/api/admin/orders", "/api/payments/admin/all", "/api/analytics/stats"]) {
    expect((await request(app).get(url).set(farmerA.auth)).status).toBe(403);
  }
  const admin = await makeAdmin();
  expect((await request(app).get("/api/admin/orders").set(admin.auth)).status).toBe(200);
});

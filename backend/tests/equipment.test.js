const { app, request, connect, disconnect, register, makeAdmin, futureDate } = require("./helpers");

let owner, owner2, farmer, admin;
beforeAll(async () => {
  await connect("equipment");
  owner = await register("equipment_owner");
  owner2 = await register("equipment_owner");
  farmer = await register("farmer");
  admin = await makeAdmin();
});
afterAll(disconnect);

const payload = { name: "Mahindra Tractor 475", category: "Tractor", price: 1800, pricing: { unit: "day" }, location: "Mysuru, KA", description: "45 HP", specs: { power: "45 HP", fuel: "Diesel", year: 2022 } };

test("owner creates, reads, edits and deletes their own listing", async () => {
  const created = await request(app).post("/api/equipment").set(owner.auth).send(payload);
  expect(created.status).toBe(201);
  const id = created.body.data.id;
  expect(created.body.data.price).toBe(1800);

  const mine = await request(app).get("/api/equipment/mine").set(owner.auth);
  expect(mine.body.data.map((e) => e.id)).toContain(id);

  const edited = await request(app).put(`/api/equipment/${id}`).set(owner.auth).send({ price: 2000, available: false, description: "Updated" });
  expect(edited.status).toBe(200);
  expect(edited.body.data.price).toBe(2000);
  expect(edited.body.data.available).toBe(false);
  expect(edited.body.data.name).toBe("Mahindra Tractor 475");

  const del = await request(app).delete(`/api/equipment/${id}`).set(owner.auth);
  expect(del.status).toBe(200);
  expect((await request(app).get(`/api/equipment/${id}`).set(farmer.auth)).status).toBe(404);
});

test("validation errors are reported", async () => {
  for (const bad of [{ ...payload, name: "" }, { ...payload, price: -5 }, { ...payload, price: "abc" }, { ...payload, category: undefined }, { ...payload, discount: 150 }, { ...payload, pricing: { unit: "week" } }, { ...payload, lat: 200, lng: 10 }]) {
    const res = await request(app).post("/api/equipment").set(owner.auth).send(bad);
    expect(res.status).toBe(400);
  }
});

test("other owners and farmers cannot modify someone else's listing; admin can", async () => {
  const created = await request(app).post("/api/equipment").set(owner.auth).send(payload);
  const id = created.body.data.id;
  expect((await request(app).put(`/api/equipment/${id}`).set(owner2.auth).send({ price: 1 })).status).toBe(403);
  expect((await request(app).delete(`/api/equipment/${id}`).set(owner2.auth)).status).toBe(403);
  expect((await request(app).put(`/api/equipment/${id}`).set(farmer.auth).send({ price: 1 })).status).toBe(403);
  expect((await request(app).put(`/api/equipment/${id}`).set(admin.auth).send({ price: 1999 })).status).toBe(200);
  expect((await request(app).get("/api/equipment/mine").set(owner2.auth)).body.data).toEqual([]);
});

test("cannot delete equipment with open rental requests", async () => {
  const created = await request(app).post("/api/equipment").set(owner.auth).send({ ...payload, name: "Busy Tractor" });
  const id = created.body.data.id;
  await request(app).post("/api/orders").set(farmer.auth).send({ type: "equipment", itemId: id, startDate: futureDate(3), endDate: futureDate(4) });
  const del = await request(app).delete(`/api/equipment/${id}`).set(owner.auth);
  expect(del.status).toBe(409);
});

test("listing limit per owner is enforced and configurable by admin", async () => {
  const o = await register("equipment_owner");
  await request(app).put("/api/admin/settings").set(admin.auth).send({ "marketplace.maxListingsPerOwner": 2 });
  for (let i = 0; i < 2; i += 1) expect((await request(app).post("/api/equipment").set(o.auth).send({ ...payload, name: `Item ${i}` })).status).toBe(201);
  const third = await request(app).post("/api/equipment").set(o.auth).send({ ...payload, name: "Item 3" });
  expect(third.status).toBe(403);
  await request(app).put("/api/admin/settings").set(admin.auth).send({ "marketplace.maxListingsPerOwner": 10 });
});

test("listing saves coordinates only when valid and inherits the owner's saved location", async () => {
  const o = await register("equipment_owner");
  await request(app).put("/api/auth/location").set(o.auth).send({ lat: 12.97, lng: 77.59, address: "Bengaluru", source: "gps" });
  const created = await request(app).post("/api/equipment").set(o.auth).send({ ...payload, name: "Located" });
  expect(created.body.data.hasCoordinates).toBe(true);
  const noLoc = await register("equipment_owner");
  const c2 = await request(app).post("/api/equipment").set(noLoc.auth).send({ ...payload, name: "No coords" });
  expect(c2.body.data.hasCoordinates).toBe(false);
});

test("availability endpoint reports booked ranges and conflicts", async () => {
  const created = await request(app).post("/api/equipment").set(owner2.auth).send({ ...payload, name: "Calendar Tractor" });
  const id = created.body.data.id;
  const o = await request(app).post("/api/orders").set(farmer.auth).send({ type: "equipment", itemId: id, startDate: futureDate(5), endDate: futureDate(7) });
  await request(app).put(`/api/orders/${o.body.data.id}/status`).set(owner2.auth).send({ status: "approved" });
  const free = await request(app).get(`/api/equipment/${id}/availability?start=${futureDate(10)}&end=${futureDate(11)}`).set(farmer.auth);
  expect(free.body.data.requested.available).toBe(true);
  const busy = await request(app).get(`/api/equipment/${id}/availability?start=${futureDate(6)}&end=${futureDate(8)}`).set(farmer.auth);
  expect(busy.body.data.requested.available).toBe(false);
  expect(busy.body.data.bookedRanges).toHaveLength(1);
  expect((await request(app).get(`/api/equipment/${id}/availability?start=${futureDate(8)}&end=${futureDate(6)}`).set(farmer.auth)).status).toBe(400);
});

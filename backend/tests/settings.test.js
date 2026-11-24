const { app, request, connect, disconnect, register, makeAdmin } = require("./helpers");
const Notification = require("../src/models/Notification");

let admin;
beforeAll(async () => {
  await connect("settings");
  admin = await makeAdmin();
});
afterAll(disconnect);

describe("profile & account settings persist", () => {
  test("profile fields save, validate and survive a fresh login", async () => {
    const f = await register("farmer");
    const res = await request(app).put("/api/auth/profile").set(f.auth).send({ name: "Ravi Kumar", phone: "+91 98765 43210", bio: "Maize farmer", farmSize: "5 acres", cropTypes: ["Maize", "Ragi"], preferredLanguage: "kn", theme: "dark", location: "Davanagere" });
    expect(res.status).toBe(200);
    const login = await request(app).post("/api/auth/login").send({ email: f.email, password: "Passw0rd123" });
    expect(login.body.user).toMatchObject({ name: "Ravi Kumar", phone: "+91 98765 43210", preferredLanguage: "kn", theme: "dark", location: "Davanagere", farmSize: "5 acres" });
    expect(login.body.user.cropTypes).toEqual(["Maize", "Ragi"]);
  });

  test.each([
    [{ name: "A" }], [{ phone: "abc" }], [{ preferredLanguage: "fr" }], [{ theme: "neon" }], [{ cropTypes: "wheat" }], [{ avatar: "javascript:alert(1)" }],
  ])("rejects invalid input %j", async (patch) => {
    const f = await register("farmer");
    expect((await request(app).put("/api/auth/profile").set(f.auth).send(patch)).status).toBe(400);
  });

  test("cannot escalate role or plan through the profile endpoint", async () => {
    const f = await register("farmer");
    await request(app).put("/api/auth/profile").set(f.auth).send({ role: "admin", planCode: "enterprise", isActive: false, email: "x@y.com" });
    const me = (await request(app).get("/api/auth/me").set(f.auth)).body.user;
    expect(me.role).toBe("farmer");
    expect(me.planCode).toBe("farmer_free");
    expect(me.email).toBe(f.email);
  });

  test("avatar upload as image data URL is stored; oversize is refused", async () => {
    const f = await register("farmer");
    const tiny = "data:image/png;base64,iVBORw0KGgo=";
    expect((await request(app).put("/api/auth/profile").set(f.auth).send({ avatar: tiny })).body.user.avatar).toBe(tiny);
    expect((await request(app).put("/api/auth/profile").set(f.auth).send({ avatar: `data:image/png;base64,${"A".repeat(400001)}` })).status).toBe(400);
  });

  test("notification preferences validate and persist", async () => {
    const f = await register("farmer");
    expect((await request(app).put("/api/auth/settings").set(f.auth).send({ notifications: { payment: "no" } })).status).toBe(400);
    expect((await request(app).put("/api/auth/settings").set(f.auth).send({})).status).toBe(400);
    await request(app).put("/api/auth/settings").set(f.auth).send({ notifications: { weather: false, message: false } });
    const login = await request(app).post("/api/auth/login").send({ email: f.email, password: "Passw0rd123" });
    expect(login.body.user.settings.notifications).toEqual({ booking: true, payment: true, message: false, weather: false });
  });

  test("owner listing preferences are owner-only", async () => {
    const o = await register("equipment_owner");
    const f = await register("farmer");
    expect((await request(app).put("/api/auth/settings").set(f.auth).send({ listingPreferences: { autoAcceptRequests: true } })).status).toBe(403);
    const ok = await request(app).put("/api/auth/settings").set(o.auth).send({ listingPreferences: { autoAcceptRequests: true, defaultPricingUnit: "hour" } });
    expect(ok.body.user.settings.listingPreferences).toMatchObject({ autoAcceptRequests: true, defaultPricingUnit: "hour" });
    expect((await request(app).put("/api/auth/settings").set(o.auth).send({ listingPreferences: { defaultPricingUnit: "week" } })).status).toBe(400);
  });

  test("auto-accept makes new rental requests approved immediately", async () => {
    const o = await register("equipment_owner");
    await request(app).put("/api/auth/settings").set(o.auth).send({ listingPreferences: { autoAcceptRequests: true } });
    const eq = (await request(app).post("/api/equipment").set(o.auth).send({ name: "Auto", category: "Tractor", price: 500 })).body.data.id;
    const f = await register("farmer");
    const d = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    expect((await request(app).post("/api/orders").set(f.auth).send({ type: "equipment", itemId: eq, startDate: d })).body.data.status).toBe("approved");
  });
});

describe("worker profile / availability", () => {
  test("worker needs a rate to create a profile, then edits skills and availability; unavailable workers cannot be hired", async () => {
    const w = await register("worker");
    const f = await register("farmer");
    expect((await request(app).put("/api/workers/me").set(w.auth).send({ skills: ["Sowing"] })).status).toBe(400);
    expect((await request(app).get("/api/workers/me").set(w.auth)).body.data).toBeNull();
    const created = await request(app).put("/api/workers/me").set(w.auth).send({ skills: ["Sowing", "sowing", " Weeding "], pricing: { amount: 500, unit: "day" } });
    expect(created.status).toBe(200);
    expect(created.body.data.details.skills).toEqual(["Sowing", "Weeding"]);
    const off = await request(app).put("/api/workers/me").set(w.auth).send({ availability: false });
    expect(off.body.data.available).toBe(false);
    const d = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    expect((await request(app).post("/api/orders").set(f.auth).send({ type: "worker", itemId: created.body.data.id, startDate: d })).status).toBe(409);
    expect((await request(app).get("/api/workers?available=true").set(f.auth)).body.data.find((x) => x.id === created.body.data.id)).toBeUndefined();
    expect((await request(app).put("/api/workers/me").set(f.auth).send({ skills: [] })).status).toBe(403);
    expect((await request(app).put("/api/workers/me").set(w.auth).send({ pricing: { amount: -1 } })).status).toBe(400);
  });
});

describe("GPS / location", () => {
  test("saves GPS or manual location, validates ranges, can be cleared", async () => {
    const f = await register("farmer");
    expect((await request(app).put("/api/auth/location").set(f.auth).send({ lat: 95, lng: 10 })).status).toBe(400);
    expect((await request(app).put("/api/auth/location").set(f.auth).send({ lat: "abc", lng: 10 })).status).toBe(400);
    expect((await request(app).put("/api/auth/location").set(f.auth).send({})).status).toBe(400);
    expect((await request(app).put("/api/auth/location").set(f.auth).send({ lat: 10, lng: 10, source: "psychic" })).status).toBe(400);

    const manual = await request(app).put("/api/auth/location").set(f.auth).send({ address: "Hubballi, Karnataka" });
    expect(manual.body.user.location).toBe("Hubballi, Karnataka");
    expect(manual.body.user.coordinates).toBeNull();

    const gps = await request(app).put("/api/auth/location").set(f.auth).send({ lat: 15.3647, lng: 75.124, address: "Hubballi", source: "gps" });
    expect(gps.body.user.coordinates).toEqual({ lat: 15.3647, lng: 75.124 });
    expect(gps.body.user.locationSource).toBe("gps");

    const cleared = await request(app).delete("/api/auth/location").set(f.auth);
    expect(cleared.body.user.coordinates).toBeNull();
    expect((await request(app).get("/api/auth/me").set(f.auth)).body.user.coordinates).toBeNull();
  });

  test("a worker's saved location updates their public listing", async () => {
    const w = await register("worker");
    await request(app).put("/api/workers/me").set(w.auth).send({ skills: ["Ploughing"], pricing: { amount: 400, unit: "day" } });
    await request(app).put("/api/auth/location").set(w.auth).send({ lat: 14.4644, lng: 75.9218, address: "Davanagere", source: "gps" });
    const f = await register("farmer");
    const res = await request(app).get("/api/workers?q=ploughing&lat=14.5&lng=75.9").set(f.auth);
    expect(res.body.data[0].location).toBe("Davanagere");
    expect(res.body.data[0].distanceKm).toBeLessThan(10);
  });
});

describe("admin: users, settings, announcements", () => {
  test("user management: list/filter, create, change role/plan, guard rails, delete", async () => {
    const f = await register("farmer", { name: "Findable Farmer" });
    const list = await request(app).get("/api/admin/users?role=farmer&q=findable").set(admin.auth);
    expect(list.body.data.map((u) => u.id)).toContain(f.user.id);
    expect(list.body.data[0].password).toBeUndefined();
    expect(list.body.pagination).toBeDefined();

    const created = await request(app).post("/api/admin/users").set(admin.auth).send({ name: "New Admin", email: "newadmin@test.com", password: "Admin12345", role: "admin" });
    expect(created.status).toBe(201);
    expect((await request(app).post("/api/admin/users").set(admin.auth).send({ name: "Dup", email: "newadmin@test.com", password: "Admin12345", role: "farmer" })).status).toBe(409);
    expect((await request(app).post("/api/admin/users").set(admin.auth).send({ name: "Weak", email: "w@t.com", password: "weak", role: "farmer" })).status).toBe(400);

    const upd = await request(app).put(`/api/admin/users/${f.user.id}`).set(admin.auth).send({ planCode: "farmer_pro" });
    expect(upd.body.data.planCode).toBe("farmer_pro");
    expect((await request(app).put(`/api/admin/users/${f.user.id}`).set(admin.auth).send({ role: "wizard" })).status).toBe(400);
    expect((await request(app).put(`/api/admin/users/${admin.user.id}`).set(admin.auth).send({ isActive: false })).status).toBe(400);
    expect((await request(app).delete(`/api/admin/users/${admin.user.id}`).set(admin.auth)).status).toBe(400);
    expect((await request(app).delete(`/api/admin/users/${f.user.id}`).set(admin.auth)).status).toBe(200);
    expect((await request(app).get(`/api/users/${f.user.id}`).set(admin.auth)).status).toBe(404);
  });

  test("users with bookings are not deletable (deactivate instead)", async () => {
    const owner = await register("equipment_owner");
    const f = await register("farmer");
    const eq = (await request(app).post("/api/equipment").set(owner.auth).send({ name: "Xtractor", category: "Tractor", price: 100 })).body.data.id;
    await request(app).post("/api/orders").set(f.auth).send({ type: "equipment", itemId: eq, startDate: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10) });
    expect((await request(app).delete(`/api/admin/users/${f.user.id}`).set(admin.auth)).status).toBe(409);
  });

  test("system settings load, validate and persist", async () => {
    const all = await request(app).get("/api/admin/settings").set(admin.auth);
    expect(all.body.data["payments.platformFeePercent"]).toBe(0);
    const bad = await request(app).put("/api/admin/settings").set(admin.auth).send({ "payments.platformFeePercent": 99 });
    expect(bad.status).toBe(400);
    expect((await request(app).put("/api/admin/settings").set(admin.auth).send({ "made.up": 1 })).status).toBe(400);
    expect((await request(app).put("/api/admin/settings").set(admin.auth).send({ "system.maintenanceMode": "yes" })).status).toBe(400);
    const ok = await request(app).put("/api/admin/settings").set(admin.auth).send({ "payments.platformFeePercent": 5, "marketplace.maxRentalDays": 30 });
    expect(ok.body.data["payments.platformFeePercent"]).toBe(5);
    expect((await request(app).get("/api/admin/settings").set(admin.auth)).body.data["marketplace.maxRentalDays"]).toBe(30);
    const f = await register("farmer");
    expect((await request(app).get("/api/admin/settings").set(f.auth)).status).toBe(403);
    await request(app).put("/api/admin/settings").set(admin.auth).send({ "payments.platformFeePercent": 0, "marketplace.maxRentalDays": 90 });
  });

  test("announcements create one notification per recipient in the chosen role", async () => {
    const f = await register("farmer");
    const w = await register("worker");
    const res = await request(app).post("/api/admin/announcements").set(admin.auth).send({ title: "Maintenance", message: "Tonight 2am", role: "farmer" });
    expect(res.body.data.recipients).toBeGreaterThan(0);
    expect(await Notification.countDocuments({ userId: f.user.id, title: "Maintenance" })).toBe(1);
    expect(await Notification.countDocuments({ userId: w.user.id, title: "Maintenance" })).toBe(0);
    expect((await request(app).post("/api/admin/announcements").set(admin.auth).send({ title: "x" })).status).toBe(400);
  });

  test("platform stats and trends return real aggregates", async () => {
    const stats = await request(app).get("/api/analytics/stats").set(admin.auth);
    expect(stats.body.data.totalUsers).toBeGreaterThan(5);
    expect(Array.isArray(stats.body.data.roleBreakdown)).toBe(true);
    expect((await request(app).get("/api/analytics/trends").set(admin.auth)).status).toBe(200);
  });
});

test("malformed JSON and unknown routes get clean JSON errors", async () => {
  const bad = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
  expect(bad.status).toBe(400);
  expect(bad.body.success).toBe(false);
  expect((await request(app).get("/api/nope")).status).toBe(404);
  const f = await register("farmer");
  expect((await request(app).get("/api/orders/not-an-id").set(f.auth)).status).toBe(400);
});

describe("admin switches are enforced, not decorative", () => {
  test("closing registrations blocks signup; reopening allows it", async () => {
    await request(app).put("/api/admin/settings").set(admin.auth).send({ "system.allowRegistrations": false });
    const blocked = await request(app).post("/api/auth/register").send({ name: "Late User", email: "late@test.com", password: "Passw0rd123", role: "farmer" });
    expect(blocked.status).toBe(403);
    await request(app).put("/api/admin/settings").set(admin.auth).send({ "system.allowRegistrations": true });
    expect((await request(app).post("/api/auth/register").send({ name: "Late User", email: "late@test.com", password: "Passw0rd123", role: "farmer" })).status).toBe(201);
  });

  test("maintenance mode returns 503 to normal users but not to admins, health or login", async () => {
    const f = await register("farmer");
    await request(app).put("/api/admin/settings").set(admin.auth).send({ "system.maintenanceMode": true });
    const res = await request(app).get("/api/orders/my").set(f.auth);
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("MAINTENANCE");
    expect((await request(app).get("/api/health")).status).toBe(200);
    expect((await request(app).post("/api/auth/login").send({ email: f.email, password: "Passw0rd123" })).status).toBe(200);
    expect((await request(app).get("/api/admin/settings").set(admin.auth)).status).toBe(200);
    await request(app).put("/api/admin/settings").set(admin.auth).send({ "system.maintenanceMode": false });
    expect((await request(app).get("/api/orders/my").set(f.auth)).status).toBe(200);
  });

  test("removed (non-functional) settings are no longer accepted", async () => {
    expect((await request(app).put("/api/admin/settings").set(admin.auth).send({ "marketplace.requireListingApproval": true })).status).toBe(400);
    expect((await request(app).put("/api/admin/settings").set(admin.auth).send({ "system.supportEmail": "x@y.com" })).status).toBe(400);
  });
});

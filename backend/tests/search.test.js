const { app, request, connect, disconnect, register, makeAdmin } = require("./helpers");

let farmer;
beforeAll(async () => {
  await connect("search");
  const admin = await makeAdmin();
  farmer = await register("farmer");
  const seeded = await request(app).post("/api/equipment/seed").set(admin.auth);
  expect(seeded.status).toBe(200);
  // a worker who completes their profile appears in searches
  const w = await register("worker", { location: "Davanagere, KA" });
  await request(app).put("/api/workers/me").set(w.auth).send({ skills: ["Pesticide Spraying", "Irrigation"], pricing: { amount: 700, unit: "day" }, location: "Davanagere, KA" });
});
afterAll(disconnect);

const get = (url) => request(app).get(url).set(farmer.auth);

test("seeding is idempotent and never deletes", async () => {
  const admin = await makeAdmin();
  const before = (await get("/api/search?limit=60")).body.pagination.total;
  await request(app).post("/api/equipment/seed").set(admin.auth);
  await request(app).post("/api/fertilizers/seed").set(admin.auth);
  expect((await get("/api/search?limit=60")).body.pagination.total).toBe(before);
});

test("global search returns real DB results across all types", async () => {
  const res = await get("/api/search?limit=60");
  expect(res.status).toBe(200);
  const types = new Set(res.body.data.map((i) => i.type));
  expect(types).toEqual(new Set(["equipment", "worker", "seed", "fertilizer"]));
  expect(res.body.counts.equipment).toBeGreaterThanOrEqual(10);
});

test("case-insensitive, trimmed and partial matches", async () => {
  for (const q of ["tractor", "TRACTOR", "  TraCtor  ", "tract"]) {
    const res = await get(`/api/search?type=equipment&q=${encodeURIComponent(q)}`);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((i) => /tractor/i.test(`${i.name} ${i.category} ${i.description}`))).toBe(true);
  }
});

test("multi-word queries must match all words and unrelated results are excluded", async () => {
  const res = await get("/api/search?type=equipment&q=john%20tractor");
  expect(res.body.data.map((i) => i.name)).toEqual(["John Deere 5050D Tractor"]);
  const none = await get("/api/search?q=zzzznotathing");
  expect(none.body.data).toEqual([]);
  expect(none.body.pagination.total).toBe(0);
});

test("regex metacharacters are treated literally (no injection / no 500)", async () => {
  for (const q of [".*", "(", "[a-", "\\", "a|b", "$^"]) {
    const res = await get(`/api/search?q=${encodeURIComponent(q)}`);
    expect(res.status).toBe(200);
  }
  const all = await get(`/api/search?q=${encodeURIComponent(".*")}`);
  expect(all.body.data).toEqual([]);
});

test("search by category, location, price range and availability", async () => {
  const cat = await get("/api/equipment?category=Tillage");
  expect(cat.body.data.length).toBeGreaterThan(0);
  expect(cat.body.data.every((i) => i.category === "Tillage")).toBe(true);

  const loc = await get("/api/search?location=nashik");
  expect(loc.body.data.length).toBeGreaterThan(0);
  expect(loc.body.data.every((i) => /nashik/i.test(i.location))).toBe(true);

  const price = await get("/api/equipment?minPrice=1000&maxPrice=2000&limit=60");
  expect(price.body.data.length).toBeGreaterThan(0);
  expect(price.body.data.every((i) => i.price >= 1000 && i.price <= 2000)).toBe(true);

  const bad = await get("/api/equipment?minPrice=abc");
  expect(bad.status).toBe(400);
  const inverted = await get("/api/equipment?minPrice=500&maxPrice=100");
  expect(inverted.status).toBe(400);
});

test("worker search by skills and name", async () => {
  const bySkill = await get("/api/workers?skills=irrigation");
  expect(bySkill.body.data.length).toBeGreaterThan(0);
  expect(bySkill.body.data.every((w) => w.details.skills.some((s) => /irrigation/i.test(s)))).toBe(true);
  const both = await get("/api/workers?skills=Irrigation,Pesticide");
  expect(both.body.data.every((w) => w.details.skills.length >= 2)).toBe(true);
  const byName = await get("/api/workers?q=manjunath");
  expect(byName.body.data.map((w) => w.name)).toContain("Manjunath Gowda");
});

test("filters combine (AND semantics)", async () => {
  const res = await get("/api/equipment?category=Tractor&location=Pune&maxPrice=3000&available=true");
  expect(res.body.data.length).toBeGreaterThan(0);
  expect(res.body.data.every((i) => i.category === "Tractor" && /pune/i.test(i.location) && i.price <= 3000 && i.available)).toBe(true);
  const none = await get("/api/equipment?category=Tractor&location=Nagpur");
  expect(none.body.data).toEqual([]);
});

test("seeds and fertilizers are searchable by crop / type / season", async () => {
  expect((await get("/api/seeds?q=maize")).body.data[0].name).toMatch(/Maize/);
  expect((await get("/api/seeds?season=Rabi")).body.data.every((s) => s.details.season === "Rabi")).toBe(true);
  const org = await get("/api/fertilizers?fertilizerType=organic");
  expect(org.body.data.every((f) => f.details.fertilizerType === "organic")).toBe(true);
});

test("pagination is correct and consistent", async () => {
  const p1 = await get("/api/equipment?limit=4&page=1&sort=price_asc");
  const p2 = await get("/api/equipment?limit=4&page=2&sort=price_asc");
  expect(p1.body.data).toHaveLength(4);
  expect(p1.body.pagination.totalPages).toBeGreaterThanOrEqual(3);
  const ids = new Set([...p1.body.data, ...p2.body.data].map((i) => i.id));
  expect(ids.size).toBe(8);
  expect(p1.body.data[3].price).toBeLessThanOrEqual(p2.body.data[0].price);
  const global = await get("/api/search?limit=5&page=2");
  expect(global.body.data).toHaveLength(5);
});

test("sorting by price and rating", async () => {
  const asc = (await get("/api/equipment?sort=price_asc&limit=60")).body.data.map((i) => i.price);
  expect(asc).toEqual([...asc].sort((a, b) => a - b));
  const desc = (await get("/api/equipment?sort=price_desc&limit=60")).body.data.map((i) => i.price);
  expect(desc).toEqual([...desc].sort((a, b) => b - a));
});

test("suggestions return matching terms and need 2+ characters", async () => {
  expect((await get("/api/search/suggestions?q=t")).body.data).toEqual([]);
  const s = await get("/api/search/suggestions?q=trac");
  expect(s.body.data.length).toBeGreaterThan(0);
  expect(s.body.data.every((x) => /trac/i.test(x.text))).toBe(true);
});

test("GPS: distance, radius filter and distance sorting (Bengaluru origin)", async () => {
  const origin = "lat=12.9716&lng=77.5946";
  const near = await get(`/api/equipment?${origin}&sort=distance&limit=60`);
  const withDist = near.body.data.filter((i) => i.distanceKm !== null);
  expect(withDist.length).toBeGreaterThan(0);
  const dists = withDist.map((i) => i.distanceKm);
  expect(dists).toEqual([...dists].sort((a, b) => a - b));
  expect(withDist[0].location).toMatch(/Bengaluru/);
  expect(near.body.data[0].distanceKm).toBeLessThan(5);

  const radius = await get(`/api/equipment?${origin}&radius=300&limit=60`);
  expect(radius.body.data.length).toBeGreaterThan(0);
  expect(radius.body.data.every((i) => i.distanceKm !== null && i.distanceKm <= 300)).toBe(true);
  expect(radius.body.data.some((i) => /Pune|Nagpur/.test(i.location))).toBe(false);

  // coordinates themselves are never returned for listings
  expect(JSON.stringify(near.body)).not.toMatch(/"coordinates"|"geo"/);
});

test("worker distances are rounded to whole km to protect their location", async () => {
  const res = await get("/api/workers?lat=14.46&lng=75.92&sort=distance");
  const w = res.body.data.find((x) => x.distanceKm !== null);
  expect(Number.isInteger(w.distanceKm)).toBe(true);
});

test("invalid coordinates are ignored rather than producing NaN distances", async () => {
  const res = await get("/api/equipment?lat=999&lng=abc&sort=distance");
  expect(res.status).toBe(200);
  expect(res.body.data.every((i) => i.distanceKm === null)).toBe(true);
});

test("unauthenticated search is rejected", async () => {
  expect((await request(app).get("/api/search?q=tractor")).status).toBe(401);
});

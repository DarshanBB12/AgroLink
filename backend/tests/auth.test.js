const { app, request, connect, disconnect, register, PASSWORD, makeAdmin } = require("./helpers");

beforeAll(() => connect("auth"));
afterAll(disconnect);

describe("signup", () => {
  test("registers a farmer, hashes the password and returns a token + dashboard redirect", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "Asha", email: "Asha@Test.com", password: PASSWORD, role: "farmer" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("asha@test.com");
    expect(res.body.redirectTo).toBe("/dashboard/farmer");
    expect(res.body.user.password).toBeUndefined();
    const User = require("../src/models/User");
    const stored = await User.findOne({ email: "asha@test.com" }).select("+password");
    expect(stored.password).not.toBe(PASSWORD);
    expect(stored.password).toMatch(/^\$2[aby]\$/); // bcrypt
  });

  test("defaults to the farmer role when none is sent", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "No Role", email: "norole@test.com", password: PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("farmer");
  });

  test("rejects duplicate emails (case-insensitive)", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "Asha 2", email: "ASHA@test.com", password: PASSWORD, role: "farmer" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  test.each([
    ["short password", { password: "ab1" }],
    ["no digit", { password: "onlyletters" }],
    ["no letter", { password: "12345678" }],
    ["bad email", { email: "not-an-email" }],
    ["short name", { name: "A" }],
  ])("validates input: %s", async (_label, patch) => {
    const res = await request(app).post("/api/auth/register").send({ name: "Valid Name", email: "v@test.com", password: PASSWORD, ...patch });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("cannot self-register as admin", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "Evil", email: "evil@test.com", password: PASSWORD, role: "admin" });
    expect(res.status).toBe(400);
  });
});

describe("login / session", () => {
  test("logs in with correct credentials and each role gets its own redirect", async () => {
    const roles = { farmer: "/dashboard/farmer", worker: "/dashboard/worker", equipment_owner: "/dashboard/owner" };
    for (const [role, redirect] of Object.entries(roles)) {
      const u = await register(role);
      const res = await request(app).post("/api/auth/login").send({ email: u.email, password: PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.redirectTo).toBe(redirect);
      expect(res.body.user.role).toBe(role);
    }
    const admin = await makeAdmin();
    expect(admin.user.role).toBe("admin");
  });

  test("wrong password and unknown email return the same 401", async () => {
    const u = await register("farmer");
    const bad = await request(app).post("/api/auth/login").send({ email: u.email, password: "Wrong1234" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@test.com", password: PASSWORD });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body.message).toBe(unknown.body.message);
  });

  test("protected routes require a valid token", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Authorization", "Bearer garbage")).status).toBe(401);
    const u = await register("farmer");
    const me = await request(app).get("/api/auth/me").set(u.auth);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(u.email);
  });

  test("expired token is reported as TOKEN_EXPIRED", async () => {
    const jwt = require("jsonwebtoken");
    const u = await register("farmer");
    const expired = jwt.sign({ id: u.user.id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_EXPIRED");
  });

  test("role-based authorization blocks other roles", async () => {
    const farmer = await register("farmer");
    expect((await request(app).get("/api/admin/users").set(farmer.auth)).status).toBe(403);
    expect((await request(app).post("/api/equipment").set(farmer.auth).send({})).status).toBe(403);
  });

  test("password change revokes old tokens and issues a new one", async () => {
    const u = await register("farmer");
    const res = await request(app).put("/api/auth/change-password").set(u.auth).send({ currentPassword: PASSWORD, newPassword: "NewPassw0rd9" });
    expect(res.status).toBe(200);
    expect((await request(app).get("/api/auth/me").set(u.auth)).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${res.body.token}`)).status).toBe(200);
    expect((await request(app).post("/api/auth/login").send({ email: u.email, password: "NewPassw0rd9" })).status).toBe(200);
  });

  test("password change needs the correct current password", async () => {
    const u = await register("farmer");
    const res = await request(app).put("/api/auth/change-password").set(u.auth).send({ currentPassword: "Wrong1234", newPassword: "NewPassw0rd9" });
    expect(res.status).toBe(400);
  });

  test("deactivated accounts cannot log in or use an existing token", async () => {
    const admin = await makeAdmin();
    const u = await register("farmer");
    const off = await request(app).put(`/api/admin/users/${u.user.id}`).set(admin.auth).send({ isActive: false });
    expect(off.status).toBe(200);
    expect((await request(app).get("/api/auth/me").set(u.auth)).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email: u.email, password: PASSWORD })).status).toBe(403);
  });

  test("logout endpoint succeeds", async () => {
    const u = await register("farmer");
    expect((await request(app).post("/api/auth/logout").set(u.auth)).status).toBe(200);
  });
});

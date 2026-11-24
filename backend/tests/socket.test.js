const http = require("http");
const { Server } = require("socket.io");
const { io: ioc } = require("socket.io-client");
const { connect, disconnect, register, app, request } = require("./helpers");
const setupSocket = require("../src/sockets/socketHandler");
const { setIO } = require("../src/utils/io");
const Notification = require("../src/models/Notification");

let server, io, port, a, b, c;
const open = (token) =>
  new Promise((resolve, reject) => {
    const s = ioc(`http://127.0.0.1:${port}`, { auth: { token }, transports: ["websocket"], reconnection: false });
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
const once = (s, ev) => new Promise((r) => s.once(ev, r));

beforeAll(async () => {
  await connect("socket");
  a = await register("farmer");
  b = await register("equipment_owner");
  c = await register("farmer");
  server = http.createServer(app);
  io = new Server(server);
  setIO(io);
  setupSocket(io);
  await new Promise((r) => server.listen(0, r));
  port = server.address().port;
});
afterAll(async () => {
  io.close();
  server.close();
  await disconnect();
});

test("sockets require a valid token", async () => {
  await expect(open("nope")).rejects.toThrow();
  await expect(open("")).rejects.toThrow();
});

test("messages are delivered live only to the recipient, never to third parties", async () => {
  const sa = await open(a.token);
  const sb = await open(b.token);
  const sc = await open(c.token);
  let leaked = false;
  sc.on("message:receive", () => { leaked = true; });
  const got = once(sb, "message:receive");
  const ack = await new Promise((r) => sa.emit("message:send", { receiverId: b.user.id, message: "hello owner" }, r));
  expect(ack.success).toBe(true);
  const msg = await got;
  expect(msg.message).toBe("hello owner");
  expect(String(msg.senderId._id)).toBe(a.user.id);
  await new Promise((r) => setTimeout(r, 150));
  expect(leaked).toBe(false);
  // online recipients get no "offline" notification
  expect(await Notification.countDocuments({ userId: b.user.id, type: "message" })).toBe(0);
  [sa, sb, sc].forEach((s) => s.close());
});

test("offline recipients receive a notification and history is persisted", async () => {
  const sa = await open(a.token);
  const ack = await new Promise((r) => sa.emit("message:send", { receiverId: c.user.id, message: "are you there?" }, r));
  expect(ack.success).toBe(true);
  const n = await Notification.findOne({ userId: c.user.id, type: "message" });
  expect(n.link).toBe("/dashboard/farmer/chat");
  expect((await request(app).get(`/api/messages/${a.user.id}`).set(c.auth)).body.messages).toHaveLength(1);
  sa.close();
});

test("invalid sends are rejected with an error ack", async () => {
  const sa = await open(a.token);
  const ack = await new Promise((r) => sa.emit("message:send", { receiverId: "507f1f77bcf86cd799439011", message: "hi" }, r));
  expect(ack.success).toBe(false);
  const empty = await new Promise((r) => sa.emit("message:send", { receiverId: b.user.id, message: "   " }, r));
  expect(empty.success).toBe(false);
  sa.close();
});

test("clients cannot forge notifications for other users", async () => {
  const sa = await open(a.token);
  sa.emit("notification:send", { targetUserId: b.user.id, title: "FORGED", message: "x" });
  await new Promise((r) => setTimeout(r, 200));
  expect(await Notification.countDocuments({ title: "FORGED" })).toBe(0);
  sa.close();
});

test("multi-tab: user stays online until the last connection closes; notifications push live", async () => {
  const t1 = await open(b.token);
  const t2 = await open(b.token);
  t1.close();
  await new Promise((r) => setTimeout(r, 150));
  expect(io.isOnline(b.user.id)).toBe(true);
  const pushed = once(t2, "notification:new");
  const f = await register("farmer");
  const eq = (await request(app).post("/api/equipment").set(b.auth).send({ name: "Live T", category: "Tractor", price: 100 })).body.data.id;
  await request(app).post("/api/orders").set(f.auth).send({ type: "equipment", itemId: eq, startDate: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10) });
  expect((await pushed).title).toMatch(/new rental request/i);
  t2.close();
  await new Promise((r) => setTimeout(r, 150));
  expect(io.isOnline(b.user.id)).toBe(false);
});

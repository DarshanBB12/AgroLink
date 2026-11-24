process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_".padEnd(40, "x");
const mongoose = require("mongoose");
const request = require("supertest");
const { createApp } = require("../src/app");

const BASE = process.env.MONGO_TEST_URI || "mongodb://127.0.0.1:27017";
const { app } = createApp();

const connect = async (name) => {
  await mongoose.connect(`${BASE}/agrolink_test_${name}`);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
};
const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

let counter = 0;
const PASSWORD = "Passw0rd123";
const register = async (role = "farmer", overrides = {}) => {
  counter += 1;
  const body = { name: `${role} user ${counter}`, email: `${role}${counter}_${Date.now()}@test.com`, password: PASSWORD, role, ...overrides };
  const res = await request(app).post("/api/auth/register").send(body);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user, email: body.email, auth: { Authorization: `Bearer ${res.body.token}` } };
};

const makeAdmin = async () => {
  const User = require("../src/models/User");
  counter += 1;
  const email = `admin${counter}_${Date.now()}@test.com`;
  await User.create({ name: "Admin User", email, password: PASSWORD, role: "admin", planCode: "enterprise" });
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
  return { token: res.body.token, user: res.body.user, auth: { Authorization: `Bearer ${res.body.token}` } };
};

const futureDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

module.exports = { app, request, mongoose, connect, disconnect, register, makeAdmin, PASSWORD, futureDate };

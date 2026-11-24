const { app, request, connect, disconnect, register, makeAdmin } = require("./helpers");
const Loan = require("../src/models/Loan");
const gateway = require("../src/services/paymentGateway");

let farmer, admin;
beforeAll(async () => {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  gateway._setClientForTests(null);
  await connect("emi");
  farmer = await register("farmer");
  admin = await makeAdmin();
});
afterAll(disconnect);

let loanId;

test("EMI calculator is consistent and validated", async () => {
  const res = await request(app).post("/api/emi/calculate").set(farmer.auth).send({ principal: 120000, months: 12, annualRate: 12 });
  expect(res.status).toBe(200);
  expect(JSON.stringify(res.body)).toMatch(/10[0-9]{3}/); // ~10,661
  expect((await request(app).post("/api/emi/calculate").set(farmer.auth).send({ principal: -5, months: 12 })).status).toBe(400);
  expect((await request(app).post("/api/emi/calculate").set(farmer.auth).send({ principal: 10000, months: 1 })).status).toBe(400);
});

test("apply: minimum amount and tenure enforced; applicant cannot choose the interest rate", async () => {
  expect((await request(app).post("/api/emi/apply").set(farmer.auth).send({ loanAmount: 100, loanTerm: 12, purpose: "seeds" })).status).toBe(400);
  expect((await request(app).post("/api/emi/apply").set(farmer.auth).send({ loanAmount: 50000, loanTerm: 99, purpose: "seeds" })).status).toBe(400);
  const res = await request(app).post("/api/emi/apply").set(farmer.auth).send({ loanAmount: 60000, loanTerm: 12, purpose: "equipment", interestRate: 0 });
  expect(res.status).toBe(201);
  loanId = res.body.loan._id;
  expect(res.body.loan.interestRate).toBe(8.5);
  expect(res.body.loan.loanStatus).toBe("pending");
  expect((await request(app).post("/api/emi/apply").set((await makeAdmin()).auth).send({ loanAmount: 60000, loanTerm: 12, purpose: "other" })).status).toBe(403);
});

test("loans are private to the farmer; admin can review", async () => {
  const other = await register("farmer");
  expect((await request(app).get("/api/emi/my-loans").set(other.auth)).body.loans).toEqual([]);
  expect((await request(app).get(`/api/emi/${loanId}`).set(other.auth)).status).toBe(403);
  expect((await request(app).put(`/api/emi/${loanId}/approve`).set(farmer.auth)).status).toBe(403);
  expect((await request(app).get("/api/emi/admin/pending").set(admin.auth)).body.loans.length).toBe(1);
});

test("cannot pay before approval; after approval the farmer pays through the gateway flow", async () => {
  expect((await request(app).post(`/api/payments/emi/${loanId}/create`).set(farmer.auth)).status).toBe(409);
  const ok = await request(app).put(`/api/emi/${loanId}/approve`).set(admin.auth);
  expect(ok.status).toBe(200);
  const before = await Loan.findById(loanId);

  const create = await request(app).post(`/api/payments/emi/${loanId}/create`).set(farmer.auth);
  expect(create.status).toBe(201);
  const t = create.body.data.transaction;
  expect(t.amount).toBe(Math.round(before.monthlyEMI * 100) / 100);
  expect(t.purpose).toBe("emi");
  expect((await Loan.findById(loanId)).remainingAmount).toBe(before.remainingAmount); // unchanged until confirmed

  const confirm = await request(app).post(`/api/payments/${t.id}/test-confirm`).set(farmer.auth).send({ outcome: "success" });
  expect(confirm.body.data.status).toBe("completed");
  const after = await Loan.findById(loanId);
  expect(after.remainingAmount).toBeCloseTo(before.remainingAmount - t.amount, 1);
  expect(after.totalEMIPaid).toBe(1);

  // repeat confirm must not double-count
  await request(app).post(`/api/payments/${t.id}/test-confirm`).set(farmer.auth).send({ outcome: "success" });
  expect((await Loan.findById(loanId)).totalEMIPaid).toBe(1);

  const history = await request(app).get(`/api/emi/${loanId}/payments`).set(farmer.auth);
  expect(history.body.payments).toHaveLength(1);
  expect((await request(app).get("/api/payments/my?purpose=emi").set(farmer.auth)).body.data).toHaveLength(1);
});

test("farmers can no longer self-report EMI payments; admin can record offline payments with a method", async () => {
  expect((await request(app).post("/api/emi/pay").set(farmer.auth).send({ loanId, amount: 1000, paymentMethod: "online" })).status).toBe(403);
  expect((await request(app).post("/api/emi/pay").set(admin.auth).send({ loanId, amount: 1000, paymentMethod: "online" })).status).toBe(400);
  const rec = await request(app).post("/api/emi/pay").set(admin.auth).send({ loanId, amount: 1000, paymentMethod: "cash" });
  expect(rec.status).toBe(200);
  // two offline payments without a client reference must both succeed (regression: duplicate-null index bug)
  expect((await request(app).post("/api/emi/pay").set(admin.auth).send({ loanId, amount: 500, paymentMethod: "bank_transfer" })).status).toBe(200);
});

test("admin can change EMI settings and the new rate applies to new applications", async () => {
  await request(app).put("/api/admin/settings").set(admin.auth).send({ "payments.emiInterestRate": 10, "payments.emiMinAmount": 20000 });
  expect((await request(app).get("/api/emi/config").set(farmer.auth)).body.data.defaultInterestRate).toBe(10);
  expect((await request(app).post("/api/emi/apply").set(farmer.auth).send({ loanAmount: 10000, loanTerm: 6, purpose: "other" })).status).toBe(400);
  const ok = await request(app).post("/api/emi/apply").set(farmer.auth).send({ loanAmount: 25000, loanTerm: 6, purpose: "other" });
  expect(ok.body.loan.interestRate).toBe(10);
});

process.env.DB_PATH = ":memory:";
process.env.SESSION_SECRET = "test-secret";
process.env.SERVER_ID = "test-server";

const request = require("supertest");
const app = require("../../src/server/app");
const usersRepository = require("../../src/server/db/users.repository");
const patientsRepository = require("../../src/server/db/patients.repository");
const { hashPassword } = require("../../src/server/utils/password");

let patientA;
let patientB;

beforeAll(() => {
  patientA = patientsRepository.create({
    fullName: "Anna A",
    personalNumber: "p-1",
  });
  patientB = patientsRepository.create({
    fullName: "Bertil B",
    personalNumber: "p-2",
  });

  usersRepository.create({
    name: "Dr Test",
    email: "doc@test.com",
    passwordHash: hashPassword("pw"),
    role: "doctor",
  });
  usersRepository.create({
    name: "Anna A",
    email: "annaA@test.com",
    passwordHash: hashPassword("pw"),
    role: "patient",
    patientId: patientA.id,
  });
  usersRepository.create({
    name: "Sneaky",
    email: "sneaky@test.com",
    passwordHash: hashPassword("pw"),
    role: "unauthorized",
  });
});

async function loginAs(email) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: "pw" });
  return agent;
}

describe("patient journal access control", () => {
  it("lets staff view any patient record", async () => {
    const agent = await loginAs("doc@test.com");
    const res = await agent.get(`/api/patients/${patientB.id}`);
    expect(res.status).toBe(200);
  });

  it("lets a patient view their own record", async () => {
    const agent = await loginAs("annaA@test.com");
    const res = await agent.get(`/api/patients/${patientA.id}`);
    expect(res.status).toBe(200);
  });

  it("blocks a patient from viewing another patient by editing the URL", async () => {
    const agent = await loginAs("annaA@test.com");
    const res = await agent.get(`/api/patients/${patientB.id}`);
    expect(res.status).toBe(403);
  });

  it("blocks the unauthorized role from any patient record", async () => {
    const agent = await loginAs("sneaky@test.com");
    const res = await agent.get(`/api/patients/${patientA.id}`);
    expect(res.status).toBe(403);
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get(`/api/patients/${patientA.id}`);
    expect(res.status).toBe(401);
  });
});

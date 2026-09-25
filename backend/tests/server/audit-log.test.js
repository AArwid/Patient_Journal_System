process.env.DB_PATH = ":memory:";
process.env.SESSION_SECRET = "test-secret";
process.env.SERVER_ID = "test-server";

const request = require("supertest");
const app = require("../../src/server/app");
const usersRepository = require("../../src/server/db/users.repository");
const patientsRepository = require("../../src/server/db/patients.repository");
const { hashPassword } = require("../../src/server/utils/password");

let patient;

beforeAll(() => {
  patient = patientsRepository.create({
    fullName: "Erik E",
    personalNumber: "p-4",
  });
  usersRepository.create({
    name: "Doc",
    email: "doc3@test.com",
    passwordHash: hashPassword("pw"),
    role: "doctor",
  });
  usersRepository.create({
    name: "Sneaky",
    email: "sneaky2@test.com",
    passwordHash: hashPassword("pw"),
    role: "unauthorized",
  });
});

async function loginAs(email) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: "pw" });
  return agent;
}

describe("audit log", () => {
  it("records a granted view_journal event, visible via the access-logs endpoint", async () => {
    const asDoctor = await loginAs("doc3@test.com");
    await asDoctor.get(`/api/patients/${patient.id}`);

    const res = await asDoctor.get(`/api/patients/${patient.id}/access-logs`);
    expect(res.status).toBe(200);

    const granted = res.body.logs.find(
      (block) =>
        block.event.type === "view_journal" &&
        block.event.outcome === "granted",
    );
    expect(granted).toBeTruthy();
    expect(granted.event.actorRole).toBe("doctor");
    // Never leak journal content into the chain - metadata only.
    expect(JSON.stringify(granted)).not.toMatch(/Erik/);
  });

  it("records a denied attempt from the unauthorized role", async () => {
    const asUnauthorized = await loginAs("sneaky2@test.com");
    const deniedRes = await asUnauthorized.get(`/api/patients/${patient.id}`);
    expect(deniedRes.status).toBe(403);

    const asDoctor = await loginAs("doc3@test.com");
    const res = await asDoctor.get(`/api/patients/${patient.id}/access-logs`);

    const denied = res.body.logs.find(
      (block) =>
        block.event.actorRole === "unauthorized" &&
        block.event.outcome === "denied",
    );
    expect(denied).toBeTruthy();
  });

  it("chains each block to the previous one via previousHash", async () => {
    const asDoctor = await loginAs("doc3@test.com");
    const res = await asDoctor.get(`/api/patients/${patient.id}/access-logs`);
    const logs = res.body.logs;

    expect(logs.length).toBeGreaterThan(1);
    for (let i = 1; i < logs.length; i += 1) {
      expect(logs[i].previousHash).toBe(logs[i - 1].hash);
    }
  });
});

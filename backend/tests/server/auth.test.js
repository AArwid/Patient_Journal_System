process.env.DB_PATH = ":memory:";
process.env.SESSION_SECRET = "test-secret";
process.env.SERVER_ID = "test-server";

const request = require("supertest");
const app = require("../../src/server/app");
const usersRepository = require("../../src/server/db/users.repository");
const { hashPassword } = require("../../src/server/utils/password");

beforeAll(() => {
  usersRepository.create({
    name: "Dr Test",
    email: "doctor@test.com",
    passwordHash: hashPassword("secret123"),
    role: "doctor",
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "doctor@test.com", password: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("doctor");
  });

  it("rejects a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "doctor@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("rejects an unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nope@test.com", password: "x" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 when not logged in", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the session user after login", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: "doctor@test.com", password: "secret123" });
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("doctor");
  });
});

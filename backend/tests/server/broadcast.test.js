process.env.DB_PATH = ":memory:";
process.env.SESSION_SECRET = "test-secret";
process.env.SERVER_ID = "test-server";

const request = require("supertest");
const app = require("../../src/server/app");
const broadcastClient = require("../../src/server/services/broadcastClient");
const usersRepository = require("../../src/server/db/users.repository");
const patientsRepository = require("../../src/server/db/patients.repository");
const { hashPassword } = require("../../src/server/utils/password");
const { isNoteVisible } = broadcastClient;

let patient;

beforeAll(() => {
  patient = patientsRepository.create({
    fullName: "Britt B",
    personalNumber: "p-5",
  });
  usersRepository.create({
    name: "Doc",
    email: "doc4@test.com",
    passwordHash: hashPassword("pw"),
    role: "doctor",
  });
});

async function loginAs(email) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: "pw" });
  return agent;
}

describe("note broadcasting", () => {
  it("enforces note visibility for peer subscribers", () => {
    const privateNote = { visibility: "private", author_user_id: 4 };
    const staffNote = { visibility: "staff", author_user_id: 4 };
    const allNote = { visibility: "all", author_user_id: 4 };

    expect(isNoteVisible(privateNote, { id: 4, role: "patient" })).toBe(true);
    expect(isNoteVisible(privateNote, { id: 5, role: "doctor" })).toBe(false);
    expect(isNoteVisible(staffNote, { id: 5, role: "patient" })).toBe(false);
    expect(isNoteVisible(staffNote, { id: 5, role: "nurse" })).toBe(true);
    expect(isNoteVisible(allNote, { id: 5, role: "patient" })).toBe(true);
  });

  it("broadcasts a newly created note to the P2P/broadcast layer", async () => {
    const received = [];
    broadcastClient.onNote((note) => received.push(note));

    const agent = await loginAs("doc4@test.com");
    const res = await agent
      .post(`/api/patients/${patient.id}/notes`)
      .send({ content: "Broadcast me", visibility: "all" });

    expect(res.status).toBe(201);
    expect(received).toHaveLength(1);
    expect(received[0].content).toBe("Broadcast me");
    expect(received[0].visibility).toBe("all");
  });
});

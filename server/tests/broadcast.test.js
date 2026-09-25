process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.SERVER_ID = 'test-server';

const request = require('supertest');
const app = require('../src/app');
const broadcastClient = require('../src/services/broadcastClient');
const usersRepository = require('../src/db/users.repository');
const patientsRepository = require('../src/db/patients.repository');
const { hashPassword } = require('../src/utils/password');

let patient;

beforeAll(() => {
  patient = patientsRepository.create({ fullName: 'Britt B', personalNumber: 'p-5' });
  usersRepository.create({ name: 'Doc', email: 'doc4@test.com', passwordHash: hashPassword('pw'), role: 'doctor' });
});

async function loginAs(email) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'pw' });
  return agent;
}

describe('note broadcasting', () => {
  it('broadcasts a newly created note to the P2P/broadcast layer', async () => {
    const received = [];
    broadcastClient.onNote((note) => received.push(note));

    const agent = await loginAs('doc4@test.com');
    const res = await agent
      .post(`/api/patients/${patient.id}/notes`)
      .send({ content: 'Broadcast me', visibility: 'all' });

    expect(res.status).toBe(201);
    expect(received).toHaveLength(1);
    expect(received[0].content).toBe('Broadcast me');
    expect(received[0].visibility).toBe('all');
  });
});

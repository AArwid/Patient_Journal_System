process.env.DB_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret';
process.env.SERVER_ID = 'test-server';

const request = require('supertest');
const app = require('../src/app');
const usersRepository = require('../src/db/users.repository');
const patientsRepository = require('../src/db/patients.repository');
const { hashPassword } = require('../src/utils/password');

let patient;

beforeAll(() => {
  patient = patientsRepository.create({ fullName: 'Nina N', personalNumber: 'p-3' });
  usersRepository.create({ name: 'Doc', email: 'doc2@test.com', passwordHash: hashPassword('pw'), role: 'doctor' });
  usersRepository.create({ name: 'Nurse', email: 'nurse2@test.com', passwordHash: hashPassword('pw'), role: 'nurse' });
  usersRepository.create({
    name: 'Nina N',
    email: 'nina@test.com',
    passwordHash: hashPassword('pw'),
    role: 'patient',
    patientId: patient.id,
  });
});

async function loginAs(email) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'pw' });
  return agent;
}

describe('note visibility rules', () => {
  it('creates a note at each visibility level', async () => {
    const agent = await loginAs('doc2@test.com');
    for (const visibility of ['private', 'staff', 'all']) {
      const res = await agent
        .post(`/api/patients/${patient.id}/notes`)
        .send({ content: `note-${visibility}`, visibility });
      expect(res.status).toBe(201);
    }
  });

  it('hides a private note from other staff, but staff-level notes are visible to them', async () => {
    const asNurse = await loginAs('nurse2@test.com');
    const res = await asNurse.get(`/api/patients/${patient.id}/notes`);
    const contents = res.body.notes.map((n) => n.content);
    expect(contents).not.toContain('note-private');
    expect(contents).toContain('note-staff');
    expect(contents).toContain('note-all');
  });

  it('shows the author their own private note', async () => {
    const asDoctor = await loginAs('doc2@test.com');
    const res = await asDoctor.get(`/api/patients/${patient.id}/notes`);
    const contents = res.body.notes.map((n) => n.content);
    expect(contents).toContain('note-private');
  });

  it('only shows the patient notes marked "all"', async () => {
    const asPatient = await loginAs('nina@test.com');
    const res = await asPatient.get(`/api/patients/${patient.id}/notes`);
    const contents = res.body.notes.map((n) => n.content);
    expect(contents).toContain('note-all');
    expect(contents).not.toContain('note-staff');
    expect(contents).not.toContain('note-private');
  });
});

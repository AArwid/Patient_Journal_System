// Synthetic demo data only - never use a real patient's information here.
const patientsRepository = require('./patients.repository');
const usersRepository = require('./users.repository');
const notesRepository = require('./notes.repository');
const { hashPassword } = require('../utils/password');

function upsertPatient(patient) {
  return (
    patientsRepository.findByPersonalNumber(patient.personalNumber) ||
    patientsRepository.create(patient)
  );
}

function seed() {
  const patient = upsertPatient({
    fullName: 'Karin Testsson',
    personalNumber: '19900101-0000',
    dateOfBirth: '1990-01-01',
  });

  const otherPatient = upsertPatient({
    fullName: 'Erik Provsson',
    personalNumber: '19850512-1234',
    dateOfBirth: '1985-05-12',
  });

  const demoUsers = [
    { name: 'Dr. Lena Doktor', email: 'doctor@example.com', role: 'doctor' },
    { name: 'Nils Sjuksköterska', email: 'nurse@example.com', role: 'nurse' },
    { name: 'Vårdcentralen Norr', email: 'clinic@example.com', role: 'clinic' },
    { name: 'Karin Testsson', email: 'patient@example.com', role: 'patient', patientId: patient.id },
    { name: 'Okänd Person', email: 'unauthorized@example.com', role: 'unauthorized' },
  ];

  const usersByEmail = {};
  for (const user of demoUsers) {
    usersByEmail[user.email] =
      usersRepository.findByEmail(user.email) ||
      usersRepository.create({
        name: user.name,
        email: user.email,
        passwordHash: hashPassword('password123'),
        role: user.role,
        patientId: user.patientId || null,
      });
  }

  // One note per visibility level so the access rules are visible in the UI.
  const doctor = usersByEmail['doctor@example.com'];
  const nurse = usersByEmail['nurse@example.com'];
  const demoNotes = [
    {
      patientId: patient.id,
      authorUserId: doctor.id,
      content: 'Diagnosis: acute appendicitis. Surgery scheduled for 14:00.',
      visibility: 'all',
    },
    {
      patientId: patient.id,
      authorUserId: nurse.id,
      content: 'Blood type A Rh+. Allergy: penicillin (severe). BP 120/80, pulse 78.',
      visibility: 'staff',
    },
    {
      patientId: patient.id,
      authorUserId: doctor.id,
      content: 'Personal reminder: confirm anaesthesia plan before rounds.',
      visibility: 'private',
    },
    {
      patientId: otherPatient.id,
      authorUserId: doctor.id,
      content: 'Type 2 diabetes. Metformin 500mg twice daily, follow-up in 3 months.',
      visibility: 'all',
    },
  ];

  if (notesRepository.countForPatient(patient.id) === 0) {
    for (const note of demoNotes) notesRepository.create(note);
  }

  console.log(`Seeded patients #${patient.id} and #${otherPatient.id}, ${demoUsers.length} demo users.`);
  console.log('All demo accounts use the password: password123');
}

if (require.main === module) {
  seed();
}

module.exports = seed;

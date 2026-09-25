// Synthetic demo data only - never use a real patient's information here.
const patientsRepository = require('./patients.repository');
const usersRepository = require('./users.repository');
const { hashPassword } = require('../utils/password');

function seed() {
  const patient = patientsRepository.create({
    fullName: 'Karin Testsson',
    personalNumber: '19900101-0000',
    dateOfBirth: '1990-01-01',
  });

  const demoUsers = [
    { name: 'Dr. Lena Doktor', email: 'doctor@example.com', role: 'doctor' },
    { name: 'Nils Sjuksköterska', email: 'nurse@example.com', role: 'nurse' },
    { name: 'Vårdcentralen Norr', email: 'clinic@example.com', role: 'clinic' },
    { name: 'Karin Testsson', email: 'patient@example.com', role: 'patient', patientId: patient.id },
    { name: 'Okänd Person', email: 'unauthorized@example.com', role: 'unauthorized' },
  ];

  for (const user of demoUsers) {
    if (usersRepository.findByEmail(user.email)) continue;
    usersRepository.create({
      name: user.name,
      email: user.email,
      passwordHash: hashPassword('password123'),
      role: user.role,
      patientId: user.patientId || null,
    });
  }

  console.log(`Seeded patient #${patient.id} (${patient.full_name}) and ${demoUsers.length} demo users.`);
  console.log('All demo accounts use the password: password123');
}

if (require.main === module) {
  seed();
}

module.exports = seed;

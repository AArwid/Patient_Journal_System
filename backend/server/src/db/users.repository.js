const db = require('./connection');

function findByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function create({ name, email, passwordHash, role, patientId = null }) {
  const result = db
    .prepare(
      'INSERT INTO users (name, email, password_hash, role, patient_id) VALUES (?, ?, ?, ?, ?)'
    )
    .run(name, email, passwordHash, role, patientId);
  return findById(result.lastInsertRowid);
}

module.exports = { findByEmail, findById, create };

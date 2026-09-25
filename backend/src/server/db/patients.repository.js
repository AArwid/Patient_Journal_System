const db = require('./connection');

function findById(id) {
  return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
}

function search(query) {
  return db
    .prepare('SELECT id, full_name, date_of_birth FROM patients WHERE full_name LIKE ? ORDER BY full_name LIMIT 20')
    .all(`%${query}%`);
}

function create({ fullName, personalNumber, dateOfBirth = null }) {
  const result = db
    .prepare('INSERT INTO patients (full_name, personal_number, date_of_birth) VALUES (?, ?, ?)')
    .run(fullName, personalNumber, dateOfBirth);
  return findById(result.lastInsertRowid);
}

module.exports = { findById, search, create };

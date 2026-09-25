const db = require('./connection');
const { STAFF_ROLES } = require('../constants/roles');

function create({ patientId, authorUserId, content, visibility }) {
  const result = db
    .prepare(
      'INSERT INTO notes (patient_id, author_user_id, content, visibility) VALUES (?, ?, ?, ?)'
    )
    .run(patientId, authorUserId, content, visibility);
  return findById(result.lastInsertRowid);
}

function findById(id) {
  return db
    .prepare(
      `SELECT notes.*, users.name AS author_name, users.role AS author_role
       FROM notes JOIN users ON users.id = notes.author_user_id
       WHERE notes.id = ?`
    )
    .get(id);
}

// Applies the assignment's three visibility rules server-side. Never trust a
// client-supplied filter for this - the viewer's identity decides what they see.
function findVisibleForPatient(patientId, viewer) {
  const rows = db
    .prepare(
      `SELECT notes.*, users.name AS author_name, users.role AS author_role
       FROM notes JOIN users ON users.id = notes.author_user_id
       WHERE notes.patient_id = ?
       ORDER BY notes.created_at DESC`
    )
    .all(patientId);

  return rows.filter((note) => {
    if (note.visibility === 'all') return true;
    if (note.visibility === 'private') return note.author_user_id === viewer.id;
    if (note.visibility === 'staff') return STAFF_ROLES.includes(viewer.role);
    return false;
  });
}

module.exports = { create, findById, findVisibleForPatient };

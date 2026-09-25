-- Patient Journal System - core SQL schema
--
-- IMPORTANT (GDPR boundary): all medical record content (patients, notes)
-- lives ONLY here in SQL. Access logs / audit events live on the blockchain
-- (see /blockchain), never in this database, and never the other way around.

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  personal_number TEXT NOT NULL UNIQUE,
  date_of_birth TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'nurse', 'clinic', 'patient', 'unauthorized')),
  -- Only set when role = 'patient': links the login to the patient's own record.
  patient_id INTEGER REFERENCES patients(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  author_user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  -- private = only the author, staff = doctor/nurse/clinic, all = staff + the patient
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'staff', 'all')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patients_full_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_notes_patient_id ON notes(patient_id);

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('../config');

const isMemory = config.dbPath === ':memory:';
const dbPath = isMemory ? ':memory:' : path.resolve(__dirname, '../../', config.dbPath);

if (!isMemory) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
if (!isMemory) {
  db.pragma('journal_mode = WAL');
}

const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

module.exports = db;

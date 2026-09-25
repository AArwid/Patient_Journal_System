require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 3001,
  serverId: process.env.SERVER_ID || `server-${process.env.PORT || 3001}`,
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  dbPath: process.env.DB_PATH || './data/patient_journal.db',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  peerUrls: (process.env.PEER_URLS || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
};

require("dotenv").config();
const path = require("node:path");

const dbPath = process.env.DB_PATH || "./data/patient_journal.db";

module.exports = {
  port: Number(process.env.PORT) || 3001,
  serverId: process.env.SERVER_ID || `server-${process.env.PORT || 3001}`,
  sessionSecret: process.env.SESSION_SECRET || "dev-secret-change-me",
  dbPath,
  blockchainPath:
    process.env.BLOCKCHAIN_PATH ||
    (dbPath === ":memory:"
      ? undefined
      : path.resolve(path.dirname(dbPath), "audit-blockchain.json")),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  peerUrls: (process.env.PEER_URLS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  peerPublicKeys: Object.fromEntries(
    (process.env.PEER_PUBLIC_KEYS || "")
      .split(",")
      .map((entry) => entry.split("=").map((part) => part.trim()))
      .filter(([peerId, publicKeyPath]) => peerId && publicKeyPath),
  ),
};

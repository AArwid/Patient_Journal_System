const fs = require("node:fs");
const path = require("node:path");
const { generateKeyPairSync } = require("node:crypto");
const config = require("../config");

let blockchainPromise;
let signingKeysPromise;

function getKeyPaths() {
  const configuredDbPath = process.env.DB_PATH || "./data/patient_journal.db";
  const defaultKeyDirectory =
    configuredDbPath === ":memory:"
      ? path.resolve("./keys")
      : path.resolve(path.dirname(configuredDbPath), "keys");
  const keyDirectory =
    process.env.BLOCKCHAIN_KEY_DIRECTORY || defaultKeyDirectory;
  const serverId =
    process.env.SERVER_ID || `server-${process.env.PORT || 3001}`;
  return {
    privateKeyPath:
      process.env.BLOCKCHAIN_PRIVATE_KEY_PATH ||
      path.join(keyDirectory, `${serverId}.private.pem`),
    publicKeyPath:
      process.env.BLOCKCHAIN_PUBLIC_KEY_PATH ||
      path.join(keyDirectory, `${serverId}.public.pem`),
  };
}

async function getSigningKeys() {
  if (!signingKeysPromise) {
    signingKeysPromise = import("../../blockchain/keys.js").then(
      ({ loadSigningKeyPair }) => {
        const paths = getKeyPaths();
        fs.mkdirSync(path.dirname(paths.privateKeyPath), { recursive: true });
        if (
          !fs.existsSync(paths.privateKeyPath) ||
          !fs.existsSync(paths.publicKeyPath)
        ) {
          const { privateKey, publicKey } = generateKeyPairSync("ed25519");
          fs.writeFileSync(
            paths.privateKeyPath,
            privateKey.export({ format: "pem", type: "pkcs8" }),
            { mode: 0o600 },
          );
          fs.writeFileSync(
            paths.publicKeyPath,
            publicKey.export({ format: "pem", type: "spki" }),
          );
        }
        return loadSigningKeyPair(paths);
      },
    );
  }
  return signingKeysPromise;
}

function getBlockchain() {
  if (!blockchainPromise) {
    blockchainPromise = import("../../blockchain/blockchain.js").then(
      ({ default: Blockchain }) =>
        new Blockchain({ storagePath: config.blockchainPath }),
    );
  }
  return blockchainPromise;
}

// Audit blocks are written fire-and-forget from the response 'finish' hook, so
// writes are serialised here. That keeps concurrent appends from racing on the
// chain tail, and lets readers wait for in-flight events instead of missing them.
let pendingWrites = Promise.resolve();

async function recordEvent(event) {
  const write = pendingWrites.then(async () => {
    const blockchain = await getBlockchain();
    const { privateKey } = await getSigningKeys();
    const block = blockchain.createBlock({
      event,
      privateKey,
    });
    return blockchain.appendBlock(block).toJSON();
  });
  pendingWrites = write.catch(() => {});
  return write;
}

async function getChainForPatient(patientId) {
  await pendingWrites;
  const blockchain = await getBlockchain();
  return blockchain
    .getChain()
    .filter((block) => block.event.patientId === Number(patientId));
}

// Everyone may see their own access events, including the denied ones, without
// being able to read anyone else's trail.
async function getChainForActor(actorId) {
  await pendingWrites;
  const blockchain = await getBlockchain();
  return blockchain
    .getChain()
    .filter((block) => block.event.actorId === Number(actorId));
}

async function verifyChain() {
  const blockchain = await getBlockchain();
  return {
    valid: blockchain.validateChain(),
    brokenAtIndex: null,
  };
}

module.exports = {
  recordEvent,
  getChainForPatient,
  getChainForActor,
  verifyChain,
  getBlockchain,
  getSigningKeys,
};

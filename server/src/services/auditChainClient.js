// Adapter between the Express API and the blockchain module (Arwid's part,
// see docs/blockchain-tasks.md and backend/src/blockchain/). This keeps an
// in-memory chain with a fake hash so the rest of the API can be built and
// tested independently; backend/src/blockchain is ES modules while this
// server is CommonJS, so wiring in the real Block/Blockchain classes needs
// a small interop step (dynamic import()) - tracked as a follow-up, not done
// here to avoid coupling this PR to that cross-module bridging work.
//
// Contract to preserve when wiring in the real blockchain module:
//   recordEvent(event) -> Promise<Block>
//     event: { type, outcome, patientId, actorId, actorRole, serverId }
//     Only opaque metadata - never note content or other medical data.
//   getChainForPatient(patientId) -> Promise<Block[]>
//   verifyChain() -> Promise<{ valid: boolean, brokenAtIndex: number|null }>
//
// Block shape (matches docs/blockchain-tasks.md):
//   { index, timestamp, previousHash, event, signature, hash }

const crypto = require('crypto');

const chain = [];

function fakeHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function recordEvent(event) {
  const previousBlock = chain[chain.length - 1];
  const block = {
    index: chain.length,
    timestamp: new Date().toISOString(),
    previousHash: previousBlock ? previousBlock.hash : '0'.repeat(64),
    event,
    // TODO(Arwid): replace with a real private-key signature.
    signature: 'unsigned-stub',
  };
  block.hash = fakeHash({ ...block, hash: undefined });
  chain.push(block);
  return block;
}

async function getChainForPatient(patientId) {
  return chain.filter((block) => block.event.patientId === Number(patientId));
}

async function verifyChain() {
  for (let i = 1; i < chain.length; i += 1) {
    if (chain[i].previousHash !== chain[i - 1].hash) {
      return { valid: false, brokenAtIndex: i };
    }
  }
  return { valid: true, brokenAtIndex: null };
}

module.exports = { recordEvent, getChainForPatient, verifyChain };

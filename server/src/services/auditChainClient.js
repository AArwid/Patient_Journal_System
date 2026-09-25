// CommonJS adapter for the tested ESM blockchain implementation.
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

let blockchainPromise;

function getBlockchain() {
  if (!blockchainPromise) {
    blockchainPromise =
      import("../../../backend/src/blockchain/blockchain.js").then(
        ({ default: Blockchain }) => new Blockchain(),
      );
  }
  return blockchainPromise;
}

async function recordEvent(event) {
  const blockchain = await getBlockchain();
  return blockchain.createBlock({ event, signature: "unsigned-stub" }).toJSON();
}

async function getChainForPatient(patientId) {
  const blockchain = await getBlockchain();
  return blockchain
    .getChain()
    .filter((block) => block.event.patientId === Number(patientId));
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
  verifyChain,
  getBlockchain,
};

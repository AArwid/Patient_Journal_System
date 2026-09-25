let blockchainPromise;
const UNSIGNED_SIGNATURE =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

function getBlockchain() {
  if (!blockchainPromise) {
    blockchainPromise = import("../../../src/blockchain/blockchain.js").then(
      ({ default: Blockchain }) => new Blockchain(),
    );
  }
  return blockchainPromise;
}

async function recordEvent(event) {
  const blockchain = await getBlockchain();
  const block = blockchain.createBlock({
    event,
    signature: UNSIGNED_SIGNATURE,
  });
  return blockchain.appendBlock(block).toJSON();
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

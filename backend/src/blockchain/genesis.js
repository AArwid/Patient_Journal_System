import Block from "./block.js";
import { calculateBlockHash } from "./hash.js";

const GENESIS_INDEX = 0;
const GENESIS_TIMESTAMP = "2026-09-16T00:00:00.000Z";
const GENESIS_PREVIOUS_HASH = "0";
const GENESIS_EVENT = Object.freeze({
  type: "genesis",
  recordId: "genesis",
});
const GENESIS_SIGNATURE = "genesis";

function createGenesisBlock() {
  const blockData = {
    index: GENESIS_INDEX,
    timestamp: GENESIS_TIMESTAMP,
    previousHash: GENESIS_PREVIOUS_HASH,
    event: GENESIS_EVENT,
    signature: GENESIS_SIGNATURE,
  };

  return new Block({
    ...blockData,
    hash: calculateBlockHash(blockData),
  });
}

export {
  GENESIS_EVENT,
  GENESIS_INDEX,
  GENESIS_PREVIOUS_HASH,
  GENESIS_SIGNATURE,
  GENESIS_TIMESTAMP,
  createGenesisBlock,
};

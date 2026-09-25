import Block from "./block.js";
import { calculateBlockHash } from "./hash.js";
import { createMerkleRoot } from "./merkle.js";
import { signBlockPayload } from "./signing.js";

function createBlock({
  previousBlock,
  event,
  privateKey,
  signature,
  timestamp = new Date().toISOString(),
}) {
  const blockData = {
    index: previousBlock.index + 1,
    timestamp,
    previousHash: previousBlock.hash,
    event,
    signature,
  };

  const blockSignature = privateKey
    ? signBlockPayload(blockData, privateKey)
    : signature;

  return new Block({
    ...blockData,
    signature: blockSignature,
    hash: calculateBlockHash(blockData),
  });
}

function createMerkleBatchBlock({
  previousBlock,
  leaves,
  privateKey,
  signature,
  timestamp,
}) {
  if (!Array.isArray(leaves) || leaves.length === 0) {
    throw new RangeError("Merkle batch must contain at least one leaf");
  }

  return createBlock({
    previousBlock,
    privateKey,
    signature,
    timestamp,
    event: {
      type: "merkle.batch",
      merkleRoot: createMerkleRoot(leaves),
      leafCount: leaves.length,
    },
  });
}

export { createBlock, createMerkleBatchBlock };

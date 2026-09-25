import { createGenesisBlock } from "./genesis.js";
import { calculateBlockHash } from "./hash.js";
import { serializeBlockPayload } from "./serialization.js";
import { verifyBlockSignature } from "./signing.js";

function normalizeChain(chain, Block) {
  if (!Array.isArray(chain)) return null;
  return chain.map((block) =>
    block instanceof Block ? block : new Block(block),
  );
}

function validateChain(chain, Block, publicKey) {
  try {
    const blocks = normalizeChain(chain, Block);
    if (!blocks || blocks.length === 0) return false;

    const expectedGenesis = createGenesisBlock();
    if (
      serializeBlockPayload(blocks[0]) !==
        serializeBlockPayload(expectedGenesis) ||
      blocks[0].signature !== expectedGenesis.signature ||
      blocks[0].hash !== expectedGenesis.hash
    ) {
      return false;
    }

    return blocks.every((block, index) => {
      const previousBlock = blocks[index - 1];
      if (block.index !== index) return false;
      if (index > 0 && block.previousHash !== previousBlock.hash) {
        return false;
      }
      if (calculateBlockHash(block) !== block.hash) return false;
      if (index === 0 || !publicKey) return true;
      return verifyBlockSignature(block, publicKey);
    });
  } catch {
    return false;
  }
}

function verifyBlockIntegrity(block, chain, Block, publicKey) {
  try {
    const normalizedBlock = block instanceof Block ? block : new Block(block);
    const blockIndex = chain.findIndex(
      (storedBlock) => storedBlock.hash === normalizedBlock.hash,
    );
    const previousBlock = blockIndex > 0 ? chain[blockIndex - 1] : undefined;

    if (normalizedBlock.index === 0) {
      return {
        valid: validateChain([normalizedBlock], Block),
        reason: "genesis block",
      };
    }
    if (calculateBlockHash(normalizedBlock) !== normalizedBlock.hash) {
      return { valid: false, reason: "hash mismatch" };
    }
    if (previousBlock && normalizedBlock.previousHash !== previousBlock.hash) {
      return { valid: false, reason: "previous hash mismatch" };
    }
    if (!verifyBlockSignature(normalizedBlock, publicKey)) {
      return { valid: false, reason: "signature verification failed" };
    }
    return { valid: true, reason: "verified" };
  } catch {
    return { valid: false, reason: "malformed block" };
  }
}

export { normalizeChain, validateChain, verifyBlockIntegrity };

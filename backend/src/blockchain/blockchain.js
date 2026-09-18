import Block from "./block.js";
import { createGenesisBlock } from "./genesis.js";
import { calculateBlockHash } from "./hash.js";
import { serializeBlockPayload } from "./serialization.js";
import {
  signBlockPayload,
  validateSignature,
  verifyBlockSignature,
} from "./signing.js";
import { createMerkleRoot } from "./merkle.js";

class Blockchain {
  #blocks;

  constructor() {
    this.#blocks = [createGenesisBlock()];
  }

  createBlock({
    event,
    privateKey,
    signature,
    timestamp = new Date().toISOString(),
  }) {
    const previousBlock = this.#blocks.at(-1);
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

  createMerkleBatchBlock({
    leaves,
    privateKey,
    signature,
    timestamp = new Date().toISOString(),
  }) {
    if (!Array.isArray(leaves) || leaves.length === 0) {
      throw new RangeError("Merkle batch must contain at least one leaf");
    }

    return this.createBlock({
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

  appendBlock(block, publicKey) {
    const previousBlock = this.#blocks.at(-1);
    const normalizedBlock = block instanceof Block ? block : new Block(block);

    validateSignature(normalizedBlock.signature);
    if (
      normalizedBlock.index !== previousBlock.index + 1 ||
      normalizedBlock.previousHash !== previousBlock.hash
    ) {
      throw new Error(
        "Block index or previousHash does not follow the latest block",
      );
    }

    if (publicKey && !verifyBlockSignature(normalizedBlock, publicKey)) {
      throw new Error("Block signature verification failed");
    }

    if (!this.validateChain([...this.#blocks, normalizedBlock], publicKey)) {
      throw new Error("Block failed chain validation");
    }

    this.#blocks.push(normalizedBlock);
    return normalizedBlock;
  }

  validateChain(chain = this.#blocks, publicKey) {
    try {
      if (!Array.isArray(chain) || chain.length === 0) {
        return false;
      }

      const expectedGenesis = createGenesisBlock();
      const blocks = chain.map((block) =>
        block instanceof Block ? block : new Block(block),
      );

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
        if (block.index !== index) {
          return false;
        }

        if (index > 0 && block.previousHash !== previousBlock.hash) {
          return false;
        }

        if (calculateBlockHash(block) !== block.hash) {
          return false;
        }

        if (index === 0) {
          return true;
        }

        if (!publicKey) {
          return true;
        }

        return verifyBlockSignature(block, publicKey);
      });
    } catch {
      return false;
    }
  }

  verifyBlockIntegrity(block, publicKey) {
    try {
      const normalizedBlock = block instanceof Block ? block : new Block(block);
      const chain = this.#blocks;
      const blockIndex = chain.findIndex(
        (storedBlock) => storedBlock.hash === normalizedBlock.hash,
      );
      const previousBlock = blockIndex > 0 ? chain[blockIndex - 1] : undefined;

      if (normalizedBlock.index === 0) {
        return {
          valid: this.validateChain([normalizedBlock]),
          reason: "genesis block",
        };
      }

      if (calculateBlockHash(normalizedBlock) !== normalizedBlock.hash) {
        return { valid: false, reason: "hash mismatch" };
      }

      if (
        previousBlock &&
        normalizedBlock.previousHash !== previousBlock.hash
      ) {
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

  getChain() {
    return this.#blocks.map((block) => block.toJSON());
  }

  getLatestBlock() {
    return this.#blocks.at(-1).toJSON();
  }
}

export default Blockchain;

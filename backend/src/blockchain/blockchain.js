import Block from "./block.js";
import { createGenesisBlock } from "./genesis.js";
import { calculateBlockHash } from "./hash.js";
import { serializeBlockPayload } from "./serialization.js";
import { signBlockPayload, validateSignature } from "./signing.js";

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

  appendBlock(block) {
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

    if (!this.validateChain([...this.#blocks, normalizedBlock])) {
      throw new Error("Block failed chain validation");
    }

    this.#blocks.push(normalizedBlock);
    return normalizedBlock;
  }

  validateChain(chain = this.#blocks) {
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

        return calculateBlockHash(block) === block.hash;
      });
    } catch {
      return false;
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

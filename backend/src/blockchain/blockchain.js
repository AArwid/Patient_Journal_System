import Block from "./block.js";
import { createGenesisBlock } from "./genesis.js";
import { createBlock, createMerkleBatchBlock } from "./factory.js";
import { loadChain, persistChain } from "./storage.js";
import { validateSignature, verifyBlockSignature } from "./signing.js";
import {
  normalizeChain,
  validateChain,
  verifyBlockIntegrity,
} from "./validation.js";

class Blockchain {
  #blocks;
  #storagePath;

  constructor({ storagePath } = {}) {
    this.#storagePath = storagePath;
    this.#blocks = [createGenesisBlock()];
    this.#load();
  }

  createBlock({
    event,
    privateKey,
    signature,
    timestamp = new Date().toISOString(),
  }) {
    return createBlock({
      previousBlock: this.#blocks.at(-1),
      event,
      privateKey,
      signature,
      timestamp,
    });
  }

  createMerkleBatchBlock({
    leaves,
    privateKey,
    signature,
    timestamp = new Date().toISOString(),
  }) {
    return createMerkleBatchBlock({
      previousBlock: this.#blocks.at(-1),
      privateKey,
      signature,
      timestamp,
      leaves,
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
    this.#persist();
    return normalizedBlock;
  }

  replaceChain(chain, publicKey) {
    if (!Array.isArray(chain) || chain.length <= this.#blocks.length) {
      return false;
    }

    const normalizedChain = normalizeChain(chain, Block);

    if (!validateChain(normalizedChain, Block, publicKey)) {
      return false;
    }

    this.#blocks = normalizedChain;
    this.#persist();
    return true;
  }

  #load() {
    const storedChain = loadChain(
      this.#storagePath,
      (block) => new Block(block),
      (chain) => this.validateChain(chain),
    );
    if (storedChain) this.#blocks = storedChain;
    else this.#persist();
  }

  #persist() {
    persistChain(this.#storagePath, this.getChain());
  }

  validateChain(chain = this.#blocks, publicKey) {
    return validateChain(chain, Block, publicKey);
  }

  verifyBlockIntegrity(block, publicKey) {
    return verifyBlockIntegrity(block, this.#blocks, Block, publicKey);
  }

  getChain() {
    return this.#blocks.map((block) => block.toJSON());
  }

  getLatestBlock() {
    return this.#blocks.at(-1).toJSON();
  }
}

export default Blockchain;

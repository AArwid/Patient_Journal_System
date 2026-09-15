class Block {
  constructor({ index, timestamp, previousHash, event, signature, hash }) {
    Block.validateIndex(index);
    Block.validateTimestamp(timestamp);
    Block.validateHash(previousHash, "previousHash");
    Block.validateEvent(event);
    Block.validateSignature(signature);
    Block.validateHash(hash, "hash");

    this.index = index;
    this.timestamp = timestamp;
    this.previousHash = previousHash;
    this.event = { ...event };
    this.signature = signature;
    this.hash = hash;

    Object.freeze(this.event);
    Object.freeze(this);
  }

  static validateIndex(index) {
    if (!Number.isInteger(index) || index < 0) {
      throw new TypeError("Block index must be a non-negative integer");
    }
  }

  static validateTimestamp(timestamp) {
    if (typeof timestamp !== "string" || Number.isNaN(Date.parse(timestamp))) {
      throw new TypeError("Block timestamp must be a valid ISO date string");
    }
  }

  static validateHash(value, fieldName) {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError(`Block ${fieldName} must be a non-empty string`);
    }
  }

  static validateEvent(event) {
    if (event === null || typeof event !== "object" || Array.isArray(event)) {
      throw new TypeError("Block event must be an object");
    }
  }

  static validateSignature(signature) {
    if (typeof signature !== "string" || signature.length === 0) {
      throw new TypeError("Block signature must be a non-empty string");
    }
  }

  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      previousHash: this.previousHash,
      event: { ...this.event },
      signature: this.signature,
      hash: this.hash,
    };
  }
}

export default Block;

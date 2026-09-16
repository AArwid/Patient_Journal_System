import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_EVENT,
  GENESIS_INDEX,
  GENESIS_PREVIOUS_HASH,
  GENESIS_SIGNATURE,
  GENESIS_TIMESTAMP,
  createGenesisBlock,
} from "../src/blockchain/genesis.js";

test("creates a valid fixed genesis block", () => {
  const genesis = createGenesisBlock();

  assert.equal(genesis.index, GENESIS_INDEX);
  assert.equal(genesis.timestamp, GENESIS_TIMESTAMP);
  assert.equal(genesis.previousHash, GENESIS_PREVIOUS_HASH);
  assert.deepEqual(genesis.event, GENESIS_EVENT);
  assert.equal(genesis.signature, GENESIS_SIGNATURE);
  assert.match(genesis.hash, /^[a-f0-9]{64}$/);
});

test("creates the same genesis block every time", () => {
  assert.deepEqual(
    createGenesisBlock().toJSON(),
    createGenesisBlock().toJSON(),
  );
});

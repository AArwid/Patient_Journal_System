import assert from "node:assert/strict";
import test from "node:test";

import Block from "../src/blockchain/block.js";
import Blockchain from "../src/blockchain/blockchain.js";
import { calculateBlockHash } from "../src/blockchain/hash.js";

test("starts with exactly one genesis block", () => {
  const blockchain = new Blockchain();

  assert.equal(blockchain.getChain().length, 1);
  assert.equal(blockchain.getLatestBlock().index, 0);
});

test("creates and appends the next block", () => {
  const blockchain = new Blockchain();
  const block = blockchain.createBlock({
    event: { type: "journal.accessed", recordId: "opaque-record-1" },
    signature:
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
    timestamp: "2026-09-16T12:00:00.000Z",
  });

  blockchain.appendBlock(block);

  assert.deepEqual(blockchain.getLatestBlock(), block.toJSON());
  assert.equal(blockchain.getChain().length, 2);
  assert.equal(
    blockchain.getChain()[1].previousHash,
    blockchain.getChain()[0].hash,
  );
});

test("rejects blocks that do not immediately follow the latest block", () => {
  const blockchain = new Blockchain();
  const blockData = {
    index: 2,
    timestamp: "2026-09-16T12:00:00.000Z",
    previousHash: blockchain.getLatestBlock().hash,
    event: { type: "journal.accessed", recordId: "opaque-record-1" },
    signature:
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
  };
  const block = new Block({
    ...blockData,
    hash: calculateBlockHash(blockData),
  });

  assert.throws(() => blockchain.appendBlock(block), /index/);
  assert.equal(blockchain.getChain().length, 1);
});

test("exposes chain snapshots without allowing array mutation", () => {
  const blockchain = new Blockchain();
  const chain = blockchain.getChain();

  chain.pop();

  assert.equal(blockchain.getChain().length, 1);
});

test("validates an intact chain", () => {
  const blockchain = new Blockchain();
  blockchain.appendBlock(
    blockchain.createBlock({
      event: { type: "journal.accessed", recordId: "opaque-record-1" },
      signature:
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
      timestamp: "2026-09-16T12:00:00.000Z",
    }),
  );

  assert.equal(blockchain.validateChain(), true);
});

test("rejects changed data, hashes, links, ordering, and malformed blocks", () => {
  const blockchain = new Blockchain();
  blockchain.appendBlock(
    blockchain.createBlock({
      event: { type: "journal.accessed", recordId: "opaque-record-1" },
      signature:
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
      timestamp: "2026-09-16T12:00:00.000Z",
    }),
  );
  const chain = blockchain.getChain();

  const changedEvent = structuredClone(chain);
  changedEvent[1].event.recordId = "opaque-record-2";
  assert.equal(blockchain.validateChain(changedEvent), false);

  const changedHash = structuredClone(chain);
  changedHash[1].hash = "tampered-hash";
  assert.equal(blockchain.validateChain(changedHash), false);

  const brokenLink = structuredClone(chain);
  brokenLink[1].previousHash = "broken-link";
  assert.equal(blockchain.validateChain(brokenLink), false);

  assert.equal(blockchain.validateChain([chain[1], chain[0]]), false);
  assert.equal(blockchain.validateChain([{ index: 0 }]), false);
});

test("rejects an invalid genesis block", () => {
  const blockchain = new Blockchain();
  const chain = blockchain.getChain();
  chain[0].event.type = "not-genesis";

  assert.equal(blockchain.validateChain(chain), false);
});

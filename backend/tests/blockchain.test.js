import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import Block from "../src/blockchain/block.js";
import Blockchain from "../src/blockchain/blockchain.js";
import { calculateBlockHash } from "../src/blockchain/hash.js";

test("starts with exactly one genesis block", () => {
  const blockchain = new Blockchain();

  assert.equal(blockchain.getChain().length, 1);
  assert.equal(blockchain.getLatestBlock().index, 0);
});

test("loads persisted blocks after a restart", () => {
  const directory = mkdtempSync(join(tmpdir(), "patient-journal-chain-"));
  const storagePath = join(directory, "audit-blockchain.json");

  try {
    const firstInstance = new Blockchain({ storagePath });
    firstInstance.appendBlock(
      firstInstance.createBlock({
        event: { type: "journal.accessed", recordId: "opaque-persisted" },
        signature:
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
        timestamp: "2026-09-16T12:00:00.000Z",
      }),
    );

    const restartedInstance = new Blockchain({ storagePath });

    assert.deepEqual(restartedInstance.getChain(), firstInstance.getChain());
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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

test("returns a valid integrity result for a signed block", () => {
  const blockchain = new Blockchain();
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const block = blockchain.createBlock({
    event: { type: "journal.accessed", recordId: "opaque-record-1" },
    privateKey,
    timestamp: "2026-09-16T12:00:00.000Z",
  });
  blockchain.appendBlock(block);

  assert.deepEqual(blockchain.verifyBlockIntegrity(block, publicKey), {
    valid: true,
    reason: "verified",
  });
  assert.equal(
    blockchain.validateChain(blockchain.getChain(), publicKey),
    true,
  );
});

test("reports invalid integrity for a changed signed block", () => {
  const blockchain = new Blockchain();
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const block = blockchain.createBlock({
    event: { type: "journal.accessed", recordId: "opaque-record-1" },
    privateKey,
    timestamp: "2026-09-16T12:00:00.000Z",
  });
  const changedBlock = {
    ...block.toJSON(),
    event: { type: "journal.accessed", recordId: "changed-record" },
  };

  assert.deepEqual(blockchain.verifyBlockIntegrity(changedBlock, publicKey), {
    valid: false,
    reason: "hash mismatch",
  });
});

test("rejects a mismatched signature when appending with a trusted public key", () => {
  const blockchain = new Blockchain();
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const validBlock = blockchain.createBlock({
    event: { type: "journal.accessed", recordId: "opaque-record-1" },
    privateKey,
    timestamp: "2026-09-16T12:00:00.000Z",
  });

  const tamperedBlock = {
    ...validBlock.toJSON(),
    event: { type: "journal.accessed", recordId: "changed-record" },
    hash: calculateBlockHash({
      index: validBlock.index,
      timestamp: validBlock.timestamp,
      previousHash: validBlock.previousHash,
      event: { type: "journal.accessed", recordId: "changed-record" },
    }),
  };

  assert.throws(
    () => blockchain.appendBlock(tamperedBlock, publicKey),
    /signature/i,
  );
});

test("stores only Merkle root metadata in a batch block", () => {
  const blockchain = new Blockchain();
  const leaves = [
    { eventType: "journal.accessed", recordId: "opaque-1" },
    { eventType: "journal.accessed", recordId: "opaque-2" },
  ];
  const block = blockchain.createMerkleBatchBlock({
    leaves,
    signature:
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
    timestamp: "2026-09-16T12:00:00.000Z",
  });

  assert.equal(block.event.type, "merkle.batch");
  assert.equal(block.event.leafCount, 2);
  assert.match(block.event.merkleRoot, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(block).includes("opaque-1"), false);
});

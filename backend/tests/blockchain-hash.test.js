import assert from "node:assert/strict";
import test from "node:test";

import { calculateBlockHash } from "../src/blockchain/hash.js";

const block = {
  index: 1,
  timestamp: "2026-09-16T12:00:00.000Z",
  previousHash: "genesis-hash",
  event: {
    type: "journal.accessed",
    recordId: "opaque-record-1",
  },
  signature: "signature-not-in-hash-payload",
  hash: "stored-hash-is-not-in-hash-payload",
};

test("calculates a deterministic SHA-256 hash from the canonical payload", () => {
  const firstHash = calculateBlockHash(block);
  const secondHash = calculateBlockHash({ ...block });

  assert.equal(firstHash, secondHash);
  assert.match(firstHash, /^[a-f0-9]{64}$/);
});

test("changes the hash when a payload field changes", () => {
  const changedBlock = {
    ...block,
    event: { ...block.event, recordId: "opaque-record-2" },
  };

  assert.notEqual(calculateBlockHash(block), calculateBlockHash(changedBlock));
});

test("does not include the stored hash or signature in the digest", () => {
  const changedMetadata = {
    ...block,
    signature: "different-signature",
    hash: "different-stored-hash",
  };

  assert.equal(calculateBlockHash(block), calculateBlockHash(changedMetadata));
});

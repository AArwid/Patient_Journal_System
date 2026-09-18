import assert from "node:assert/strict";
import test from "node:test";

import {
  createMerkleRoot,
  generateMerkleProof,
  hashMerkleLeaf,
  verifyMerkleProof,
} from "../src/blockchain/merkle.js";

const leaves = [
  { eventType: "journal.accessed", recordId: "opaque-1", actorId: "actor-1" },
  { eventType: "journal.accessed", recordId: "opaque-2", actorId: "actor-2" },
  { eventType: "journal.accessed", recordId: "opaque-3", actorId: "actor-3" },
  { eventType: "journal.accessed", recordId: "opaque-4", actorId: "actor-4" },
];

test("returns null for an empty Merkle batch", () => {
  assert.equal(createMerkleRoot([]), null);
});

test("creates deterministic roots for one, two, and odd leaf batches", () => {
  assert.match(createMerkleRoot([leaves[0]]), /^[a-f0-9]{64}$/);
  assert.equal(
    createMerkleRoot(leaves.slice(0, 2)),
    createMerkleRoot(leaves.slice(0, 2)),
  );
  assert.equal(
    createMerkleRoot(leaves.slice(0, 3)),
    createMerkleRoot([...leaves.slice(0, 3)]),
  );
});

test("generates and verifies proofs, including duplicated odd leaves", () => {
  const batch = leaves.slice(0, 3);
  const root = createMerkleRoot(batch);

  for (let index = 0; index < batch.length; index += 1) {
    assert.equal(
      verifyMerkleProof(batch[index], generateMerkleProof(batch, index), root),
      true,
    );
  }
});

test("rejects changed leaves, invalid proofs, and unsupported medical fields", () => {
  const root = createMerkleRoot(leaves.slice(0, 2));
  const proof = generateMerkleProof(leaves.slice(0, 2), 0);

  assert.equal(
    verifyMerkleProof(
      { ...leaves[0], recordId: "changed-record" },
      proof,
      root,
    ),
    false,
  );
  assert.equal(
    verifyMerkleProof(leaves[0], [{ ...proof[0], hash: "bad" }], root),
    false,
  );
  assert.throws(
    () => hashMerkleLeaf({ ...leaves[0], diagnosis: "private" }),
    /unsupported field/,
  );
});

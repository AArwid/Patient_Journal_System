import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import {
  signBlockPayload,
  validateSignature,
} from "../src/blockchain/signing.js";

const blockPayload = {
  index: 1,
  timestamp: "2026-09-16T12:00:00.000Z",
  previousHash: "genesis-hash",
  event: { type: "journal.accessed", recordId: "opaque-record-1" },
};

test("signs the canonical block payload", () => {
  const { privateKey } = generateKeyPairSync("ed25519");
  const signature = signBlockPayload(blockPayload, privateKey);

  validateSignature(signature);
  assert.equal(typeof signature, "string");
});

test("changes the signature when signed payload data changes", () => {
  const { privateKey } = generateKeyPairSync("ed25519");
  const firstSignature = signBlockPayload(blockPayload, privateKey);
  const changedSignature = signBlockPayload(
    {
      ...blockPayload,
      event: { type: "journal.accessed", recordId: "changed" },
    },
    privateKey,
  );

  assert.notEqual(firstSignature, changedSignature);
});

test("rejects empty and malformed signatures", () => {
  assert.throws(() => validateSignature(""), /non-empty/);
  assert.throws(() => validateSignature("not-a-signature"), /base64/);
});

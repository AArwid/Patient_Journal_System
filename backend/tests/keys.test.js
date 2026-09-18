import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  generateSigningKeyPair,
  loadSigningKeyPair,
} from "../src/blockchain/keys.js";

test("generates and loads a matching signing key pair", () => {
  const generatedKeys = generateSigningKeyPair();
  const temporaryDirectory = mkdtempSync(
    path.join(os.tmpdir(), "patient-journal-keys-"),
  );
  const privateKeyPath = path.join(temporaryDirectory, "private.pem");
  const publicKeyPath = path.join(temporaryDirectory, "public.pem");

  try {
    writeFileSync(
      privateKeyPath,
      generatedKeys.privateKey.export({ format: "pem", type: "pkcs8" }),
    );
    writeFileSync(
      publicKeyPath,
      generatedKeys.publicKey.export({ format: "pem", type: "spki" }),
    );

    const loadedKeys = loadSigningKeyPair({ privateKeyPath, publicKeyPath });

    assert.equal(loadedKeys.privateKey.asymmetricKeyType, "ed25519");
    assert.equal(loadedKeys.publicKey.asymmetricKeyType, "ed25519");
    assert.deepEqual(
      loadedKeys.publicKey.export({ format: "der", type: "spki" }),
      generatedKeys.publicKey.export({ format: "der", type: "spki" }),
    );
    assert.equal(readFileSync(privateKeyPath).includes("PRIVATE KEY"), true);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("rejects a mismatched public key", () => {
  const firstKeys = generateSigningKeyPair();
  const secondKeys = generateSigningKeyPair();
  const temporaryDirectory = mkdtempSync(
    path.join(os.tmpdir(), "patient-journal-keys-"),
  );
  const privateKeyPath = path.join(temporaryDirectory, "private.pem");
  const publicKeyPath = path.join(temporaryDirectory, "public.pem");

  try {
    writeFileSync(
      privateKeyPath,
      firstKeys.privateKey.export({ format: "pem", type: "pkcs8" }),
    );
    writeFileSync(
      publicKeyPath,
      secondKeys.publicKey.export({ format: "pem", type: "spki" }),
    );

    assert.throws(
      () => loadSigningKeyPair({ privateKeyPath, publicKeyPath }),
      /does not match/,
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("rejects missing key paths", () => {
  assert.throws(() => loadSigningKeyPair(), /BLOCKCHAIN_PRIVATE_KEY_PATH/);
});

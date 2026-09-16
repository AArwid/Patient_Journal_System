import { readFileSync } from "node:fs";
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
} from "node:crypto";

const PRIVATE_KEY_PATH_ENV = "BLOCKCHAIN_PRIVATE_KEY_PATH";
const PUBLIC_KEY_PATH_ENV = "BLOCKCHAIN_PUBLIC_KEY_PATH";

function generateSigningKeyPair() {
  return generateKeyPairSync("ed25519");
}

function loadSigningKeyPair({
  privateKeyPath = process.env[PRIVATE_KEY_PATH_ENV],
  publicKeyPath = process.env[PUBLIC_KEY_PATH_ENV],
} = {}) {
  if (typeof privateKeyPath !== "string" || privateKeyPath.length === 0) {
    throw new Error(`${PRIVATE_KEY_PATH_ENV} must point to a private key file`);
  }

  if (typeof publicKeyPath !== "string" || publicKeyPath.length === 0) {
    throw new Error(`${PUBLIC_KEY_PATH_ENV} must point to a public key file`);
  }

  const privateKey = createPrivateKey(readFileSync(privateKeyPath));
  const publicKey = createPublicKey(readFileSync(publicKeyPath));

  if (!publicKeysMatch(privateKey, publicKey)) {
    throw new Error("Configured blockchain key pair does not match");
  }

  return { privateKey, publicKey };
}

function publicKeysMatch(privateKey, publicKey) {
  const derivedPublicKey = createPublicKey(privateKey).export({
    format: "der",
    type: "spki",
  });
  const configuredPublicKey = publicKey.export({
    format: "der",
    type: "spki",
  });

  return derivedPublicKey.equals(configuredPublicKey);
}

export {
  PRIVATE_KEY_PATH_ENV,
  PUBLIC_KEY_PATH_ENV,
  generateSigningKeyPair,
  loadSigningKeyPair,
};

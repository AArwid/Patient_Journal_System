import { sign, verify } from "node:crypto";

import { serializeBlockPayload } from "./serialization.js";

function signBlockPayload(block, privateKey) {
  if (!privateKey) {
    throw new TypeError("A private signing key is required");
  }

  return sign(
    null,
    Buffer.from(serializeBlockPayload(block), "utf8"),
    privateKey,
  ).toString("base64");
}

function validateSignature(signature) {
  if (typeof signature !== "string" || signature.length === 0) {
    throw new TypeError("Block signature must be a non-empty string");
  }

  try {
    const decodedSignature = Buffer.from(signature, "base64");
    if (
      decodedSignature.length !== 64 ||
      decodedSignature.toString("base64") !== signature
    ) {
      throw new Error("invalid signature encoding");
    }
  } catch {
    throw new TypeError("Block signature must be a valid base64 value");
  }
}

function verifyBlockSignature(block, publicKey) {
  if (!publicKey) {
    return false;
  }

  try {
    validateSignature(block.signature);
    return verify(
      null,
      Buffer.from(serializeBlockPayload(block), "utf8"),
      publicKey,
      Buffer.from(block.signature, "base64"),
    );
  } catch {
    return false;
  }
}

// A replicated chain carries blocks signed by different hospitals, so callers
// may pass a resolver that returns the right key for each block. A resolver
// that yields no key means the signer is unknown and the block is rejected.
function verifyBlockSignatureWith(block, publicKeyOrResolver) {
  if (typeof publicKeyOrResolver === "function") {
    const publicKey = publicKeyOrResolver(block);
    return publicKey ? verifyBlockSignature(block, publicKey) : false;
  }
  if (!publicKeyOrResolver) return true;
  return verifyBlockSignature(block, publicKeyOrResolver);
}

export {
  signBlockPayload,
  validateSignature,
  verifyBlockSignature,
  verifyBlockSignatureWith,
};

import { sign } from "node:crypto";

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

export { signBlockPayload, validateSignature };

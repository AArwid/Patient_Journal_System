import { sign, verify, createPublicKey } from "node:crypto";
import { HANDSHAKE_TYPE } from "./protocol.js";

function handshakePayload(nodeId, publicKey) {
  return {
    nodeId,
    publicKey: publicKey.export({ format: "pem", type: "spki" }).toString(),
  };
}

function serializedPayload(payload) {
  return JSON.stringify([payload.nodeId, payload.publicKey]);
}

function createHandshake(nodeId, privateKey, publicKey) {
  const payload = handshakePayload(nodeId, publicKey);
  return {
    type: HANDSHAKE_TYPE,
    source: nodeId,
    payload,
    signature: sign(
      null,
      Buffer.from(serializedPayload(payload), "utf8"),
      privateKey,
    ).toString("base64"),
  };
}

function verifyHandshake(message, trustedPublicKey) {
  try {
    if (
      !message ||
      message.type !== HANDSHAKE_TYPE ||
      message.source !== message.payload?.nodeId ||
      typeof message.signature !== "string" ||
      !message.payload.publicKey
    ) {
      return false;
    }

    const advertisedKey = createPublicKey(message.payload.publicKey);
    if (trustedPublicKey) {
      const trustedDer = trustedPublicKey.export({
        format: "der",
        type: "spki",
      });
      const advertisedDer = advertisedKey.export({
        format: "der",
        type: "spki",
      });
      if (!trustedDer.equals(advertisedDer)) return false;
    }

    return verify(
      null,
      Buffer.from(serializedPayload(message.payload), "utf8"),
      advertisedKey,
      Buffer.from(message.signature, "base64"),
    );
  } catch {
    return false;
  }
}

export { HANDSHAKE_TYPE, createHandshake, verifyHandshake };

const PROTOCOL_VERSION = 1;
const MESSAGE_TYPES = Object.freeze({
  CHAIN_REQUEST: "chain.request",
  CHAIN_RESPONSE: "chain.response",
  BLOCK_BROADCAST: "block.broadcast",
});

function createMessage(type, payload, source) {
  if (!Object.values(MESSAGE_TYPES).includes(type)) {
    throw new TypeError(`Unsupported P2P message type: ${type}`);
  }

  return {
    version: PROTOCOL_VERSION,
    type,
    source,
    payload,
  };
}

function parseMessage(raw, maxBytes = 1_000_000) {
  const normalizedRaw = Buffer.isBuffer(raw) ? raw.toString("utf8") : raw;
  const serialized =
    typeof normalizedRaw === "string"
      ? normalizedRaw
      : JSON.stringify(normalizedRaw);
  if (Buffer.byteLength(serialized, "utf8") > maxBytes) {
    throw new RangeError("P2P message exceeds the configured size limit");
  }

  const message =
    typeof normalizedRaw === "string"
      ? JSON.parse(normalizedRaw)
      : normalizedRaw;
  if (
    !message ||
    message.version !== PROTOCOL_VERSION ||
    typeof message.type !== "string" ||
    !Object.values(MESSAGE_TYPES).includes(message.type) ||
    typeof message.source !== "string" ||
    message.source.length === 0 ||
    !Object.prototype.hasOwnProperty.call(message, "payload")
  ) {
    throw new TypeError("Malformed P2P message");
  }

  return message;
}

export { MESSAGE_TYPES, PROTOCOL_VERSION, createMessage, parseMessage };

const PROTOCOL_VERSION = 1;
const HANDSHAKE_TYPE = "peer.handshake";
const MESSAGE_TYPES = Object.freeze({
  CHAIN_REQUEST: "chain.request",
  CHAIN_RESPONSE: "chain.response",
  BLOCK_BROADCAST: "block.broadcast",
  NOTE_BROADCAST: "note.broadcast",
  HANDSHAKE: HANDSHAKE_TYPE,
});

// A 'private' note is readable only by its author, who exists solely on the
// server that owns the note, so its content must never cross the network.
const REPLICABLE_NOTE_VISIBILITIES = Object.freeze(["staff", "all"]);

function isReplicableNote(note) {
  return (
    Boolean(note) &&
    typeof note === "object" &&
    !Array.isArray(note) &&
    REPLICABLE_NOTE_VISIBILITIES.includes(note.visibility)
  );
}

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

export {
  HANDSHAKE_TYPE,
  MESSAGE_TYPES,
  PROTOCOL_VERSION,
  REPLICABLE_NOTE_VISIBILITIES,
  createMessage,
  isReplicableNote,
  parseMessage,
};

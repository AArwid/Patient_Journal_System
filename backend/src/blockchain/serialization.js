const BLOCK_PAYLOAD_FIELDS = [
  "index",
  "timestamp",
  "previousHash",
  "event",
];

function serializeBlockPayload(block) {
  if (block === null || typeof block !== "object") {
    throw new TypeError("Block must be an object");
  }

  const payload = {};
  for (const field of BLOCK_PAYLOAD_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(block, field)) {
      throw new TypeError(`Block is missing ${field}`);
    }

    payload[field] = block[field];
  }

  return JSON.stringify(normalizeValue(payload, new Set()));
}

function normalizeValue(value, ancestors) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Block payload contains a non-finite number");
    }
    return value;
  }

  if (typeof value !== "object") {
    throw new TypeError("Block payload contains an unsupported value");
  }

  if (ancestors.has(value)) {
    throw new TypeError("Block payload cannot contain circular data");
  }

  ancestors.add(value);

  let normalized;
  if (Array.isArray(value)) {
    normalized = value.map((item) => normalizeValue(item, ancestors));
  } else if (isPlainObject(value)) {
    normalized = {};
    for (const key of Object.keys(value).sort()) {
      normalized[key] = normalizeValue(value[key], ancestors);
    }
  } else {
    throw new TypeError("Block payload contains a non-plain object");
  }

  ancestors.delete(value);
  return normalized;
}

function isPlainObject(value) {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export { BLOCK_PAYLOAD_FIELDS, serializeBlockPayload };

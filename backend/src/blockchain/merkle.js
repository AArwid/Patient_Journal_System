import { createHash } from "node:crypto";

const MERKLE_LEAF_FIELDS = [
  "eventType",
  "recordId",
  "actorId",
  "role",
  "timestamp",
  "serverId",
];

function hashMerkleLeaf(leaf) {
  return sha256(`leaf:${serializeMerkleLeaf(leaf)}`);
}

function createMerkleRoot(leaves) {
  if (!Array.isArray(leaves)) {
    throw new TypeError("Merkle leaves must be an array");
  }

  if (leaves.length === 0) {
    return null;
  }

  let level = leaves.map(hashMerkleLeaf);
  while (level.length > 1) {
    const nextLevel = [];
    for (let index = 0; index < level.length; index += 2) {
      const rightHash = level[index + 1] ?? level[index];
      nextLevel.push(sha256(`node:${level[index]}${rightHash}`));
    }
    level = nextLevel;
  }

  return level[0];
}

function generateMerkleProof(leaves, leafIndex) {
  if (!Array.isArray(leaves) || leaves.length === 0) {
    throw new RangeError("Cannot generate a proof for an empty batch");
  }

  if (
    !Number.isInteger(leafIndex) ||
    leafIndex < 0 ||
    leafIndex >= leaves.length
  ) {
    throw new RangeError("Merkle leaf index is out of range");
  }

  let level = leaves.map(hashMerkleLeaf);
  let currentIndex = leafIndex;
  const proof = [];

  while (level.length > 1) {
    const siblingIndex =
      currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    const siblingHash = level[siblingIndex] ?? level[currentIndex];
    proof.push({
      hash: siblingHash,
      position: currentIndex % 2 === 0 ? "right" : "left",
    });

    const nextLevel = [];
    for (let index = 0; index < level.length; index += 2) {
      const rightHash = level[index + 1] ?? level[index];
      nextLevel.push(sha256(`node:${level[index]}${rightHash}`));
    }
    level = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

function verifyMerkleProof(leaf, proof, root) {
  if (!Array.isArray(proof) || typeof root !== "string") {
    return false;
  }

  try {
    let currentHash = hashMerkleLeaf(leaf);
    for (const step of proof) {
      if (
        step === null ||
        typeof step !== "object" ||
        !/^[a-f0-9]{64}$/.test(step.hash) ||
        (step.position !== "left" && step.position !== "right")
      ) {
        return false;
      }

      currentHash =
        step.position === "left"
          ? sha256(`node:${step.hash}${currentHash}`)
          : sha256(`node:${currentHash}${step.hash}`);
    }

    return currentHash === root;
  } catch {
    return false;
  }
}

function serializeMerkleLeaf(leaf) {
  if (leaf === null || typeof leaf !== "object" || Array.isArray(leaf)) {
    throw new TypeError("Merkle leaf must be an object");
  }

  for (const key of Object.keys(leaf)) {
    if (!MERKLE_LEAF_FIELDS.includes(key)) {
      throw new TypeError(`Merkle leaf contains unsupported field: ${key}`);
    }
  }

  const payload = {};
  for (const field of MERKLE_LEAF_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(leaf, field)) {
      if (typeof leaf[field] !== "string" || leaf[field].length === 0) {
        throw new TypeError(`Merkle leaf ${field} must be a non-empty string`);
      }
      payload[field] = leaf[field];
    }
  }

  if (Object.keys(payload).length === 0) {
    throw new TypeError("Merkle leaf must contain audit metadata");
  }

  return JSON.stringify(payload);
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export {
  MERKLE_LEAF_FIELDS,
  createMerkleRoot,
  generateMerkleProof,
  hashMerkleLeaf,
  verifyMerkleProof,
};

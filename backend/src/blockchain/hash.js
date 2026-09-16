import { createHash } from "node:crypto";

import { serializeBlockPayload } from "./serialization.js";

function calculateBlockHash(block) {
  return createHash("sha256")
    .update(serializeBlockPayload(block), "utf8")
    .digest("hex");
}

export { calculateBlockHash };

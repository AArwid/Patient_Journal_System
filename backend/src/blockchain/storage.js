import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

function loadChain(storagePath, normalizeBlock, validateChain) {
  if (!storagePath) return null;

  try {
    const storedChain = JSON.parse(readFileSync(storagePath, "utf8"));
    const normalizedChain = storedChain.map(normalizeBlock);
    if (!validateChain(normalizedChain)) {
      throw new Error("Persisted blockchain failed validation");
    }
    return normalizedChain;
  } catch (error) {
    if (error.code === "ENOENT") return null;

    throw new Error(`Unable to load blockchain: ${error.message}`, {
      cause: error,
    });
  }
}

function persistChain(storagePath, chain) {
  if (!storagePath) return;

  mkdirSync(dirname(storagePath), { recursive: true });
  const temporaryPath = join(
    dirname(storagePath),
    `.${basename(storagePath)}.${process.pid}.tmp`,
  );
  writeFileSync(temporaryPath, `${JSON.stringify(chain, null, 2)}\n`, {
    mode: 0o600,
  });
  renameSync(temporaryPath, storagePath);
}

export { loadChain, persistChain };

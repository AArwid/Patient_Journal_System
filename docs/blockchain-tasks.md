# Blockchain Tasks

Use this checklist for the blockchain and immutable audit-log work. Each task should be implemented, tested, reviewed, and documented before it is marked complete.

## 1. Block and blockchain classes

- [ ] Define the block data model with `index`, `timestamp`, `previousHash`, `event`, `signature`, and `hash`.
- [ ] Implement deterministic serialization so the same block data always produces the same hash.
- [x] Implement SHA-256 hash calculation for every block.
- [x] Implement the genesis block with a fixed, documented starting value.
- [x] Implement append-only block creation and chain access.
- [x] Implement chain validation for broken links, changed data, invalid hashes, malformed blocks, and invalid ordering.
- [ ] Keep blockchain code independent from the SQL journal model.
- [ ] Do not provide an API operation that edits or deletes an audit block.

### Acceptance criteria

- A new audit event creates exactly one valid block.
- Changing any block field causes chain validation to fail.
- Removing or reordering a block causes chain validation to fail.
- Serialized blocks contain audit metadata only, never journal text or medical data.

## 2. Public/private key signing

- [x] Generate or load a signing key pair for the audit-log authority.
- [x] Store private keys outside the repository and outside database records.
- [x] Keep the public key available to verification code and peer servers.
- [ ] Sign the canonical block payload before storing or broadcasting the block.
- [x] Sign the canonical block payload before storing or broadcasting the block.
- [x] Reject empty, malformed, or unsupported signatures.
- [x] Add key-loading error handling without exposing key material in logs or responses.

Configure key files with `BLOCKCHAIN_PRIVATE_KEY_PATH` and
`BLOCKCHAIN_PUBLIC_KEY_PATH`.

### Acceptance criteria

- A valid signature can be verified with the matching public key.
- A signature made with a different key is rejected.
- Private key values never appear in source control, API responses, blockchain blocks, or debug output.

## 3. Hash and signature verification

- [x] Recalculate a block hash from its canonical payload during validation.
- [x] Verify that the stored hash matches the recalculated hash.
- [x] Verify the block signature against the trusted public key.
- [x] Verify `previousHash` against the preceding block.
- [x] Return a clear valid/invalid verification result to the audit-log UI.
- [ ] Record denied access attempts when the application requirements require them to be visible.
- [ ] Add tests for valid blocks, changed event data, changed timestamps, changed hashes, broken links, and invalid signatures.

### Acceptance criteria

- A valid block displays a valid integrity status.
- Changing event metadata, the hash, or the signature makes verification fail.
- Verification does not require storing medical journal content on the blockchain.

## 4. Merkle tree for batched access logs

- [x] Define the leaf payload using minimal audit metadata only.
- [x] Hash each access-log leaf deterministically.
- [x] Build parent hashes until one Merkle root remains.
- [x] Define and document the behavior for an odd number of leaves.
- [x] Store the Merkle root and batch metadata in a blockchain block.
- [x] Implement proof generation for an individual access log.
- [x] Implement proof verification against the stored Merkle root.
- [x] Add tests for empty batches, one leaf, two leaves, odd-sized batches, changed leaves, and invalid proofs.

### Acceptance criteria

Odd-sized batches duplicate the final leaf when building the next Merkle level.

- The same ordered batch always produces the same Merkle root.
- Changing one access log changes the root and invalidates its proof.
- A valid proof verifies without including journal text or other medical data.

## Security and GDPR checks

- [ ] Confirm that patient names, diagnoses, note contents, and full medical records are never placed on-chain.
- [ ] Use opaque identifiers or references where audit metadata needs to identify a record.
- [ ] Ensure blockchain validation runs before accepting locally received blocks.
- [ ] Add automated tests for tampering and sensitive-data leakage.
- [ ] Document key setup, test commands, and the integrity-verification flow in the README.

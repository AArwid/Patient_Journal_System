# Blockchain Audit Agent Guide

Use this guide when implementing the blockchain and immutable audit-log responsibilities for the Patient Journal System.

## Goal

Build a tamper-evident audit trail for journal access without storing medical information on the blockchain.

The blockchain may contain only minimal audit metadata, such as:

- Event type
- Opaque record identifier
- Actor identifier or role
- Timestamp
- Server identifier
- Previous hash
- Current hash
- Signature
- Merkle root when batching logs

Never store patient names, diagnoses, journal text, note contents, or full medical records on-chain.

## GitHub Cards

Create one GitHub issue or project card for each item:

- [ ] Block Model
- [ ] Canonical Serialization
- [ ] SHA-256 Hashing
- [ ] Genesis Block
- [ ] Append-Only Chain
- [ ] Chain Validation
- [ ] SQL Independence
- [ ] Immutable Audit API
- [ ] Key Pair Setup
- [ ] Block Signing
- [ ] Signature Verification
- [ ] Hash Verification
- [ ] Tamper Detection
- [ ] Merkle Leaves
- [ ] Merkle Root
- [ ] Merkle Proofs
- [ ] Security Tests
- [ ] README Documentation

## Build Steps

### 1. Block Model

Define a `Block` class or equivalent data structure containing:

- `index`
- `timestamp`
- `previousHash`
- `event`
- `signature`
- `hash`

Validate required fields at construction time. Reject malformed blocks before they enter the chain.

### 2. Canonical Serialization

Create one deterministic serialization function for block payloads. The function must:

- Serialize fields in a fixed order.
- Produce the same output for the same input.
- Exclude the calculated `hash` while calculating the hash.
- Use only audit metadata in the payload.

Use this canonical payload for hashing and signing. Do not use arbitrary object serialization in different parts of the application.

### 3. Hashing

Use SHA-256 to calculate the block hash from the canonical payload. Recalculate the hash during validation instead of trusting the stored value.

A changed event, timestamp, previous hash, or signature-related payload must result in a different hash or a failed verification.

### 4. Genesis Block

Create a fixed genesis block with:

- Index `0`.
- A documented timestamp or fixed genesis value.
- A documented `previousHash` value.
- A deterministic hash.

Every new chain must start with exactly one valid genesis block.

### 5. Append-Only Chain

Implement methods to:

- Create a block from an audit event.
- Append a valid block.
- Read the chain.
- Validate the chain.

Do not implement update or delete operations for blocks. The application must not expose an endpoint that edits or removes audit logs.

### 6. Chain Validation

Validation must reject:

- Changed block data.
- Invalid hashes.
- Broken `previousHash` links.
- Missing or malformed fields.
- Incorrect block indexes.
- Reordered blocks.
- An invalid genesis block.
- Invalid signatures.

Run validation before accepting a block received from another server.

### 7. Key Pair Setup

Use a public/private key pair for signing and verification.

- Keep the private key outside source control and database records.
- Load key paths or secrets from environment variables.
- Make the public key available to trusted verification code and peers.
- Never print key material in logs, responses, or errors.

### 8. Signing

Sign the canonical block payload with the private key before storing or broadcasting the block. Reject empty, malformed, or unsupported signatures.

The signature must cover the data that is used to calculate the block hash. A changed payload must fail signature verification.

### 9. Verification

For every block, verify:

1. Required fields are present and correctly typed.
2. The stored hash matches a newly calculated hash.
3. The previous hash matches the preceding block.
4. The signature matches the canonical payload and trusted public key.
5. The block index and ordering are valid.

Expose a simple valid or invalid integrity result to the audit-log UI.

### 10. Merkle Tree

Implement Merkle batching only after ordinary block creation and validation work.

- Hash each audit-log leaf deterministically.
- Build parent hashes until one Merkle root remains.
- Document the odd-leaf rule, such as duplicating the final leaf.
- Store only the Merkle root and batch metadata in the blockchain block.
- Generate and verify proofs for individual access logs.

Merkle leaves and proofs must not contain medical journal content.

## Tests

Add automated tests for:

- Block creation.
- Deterministic serialization.
- SHA-256 hashing.
- Genesis block validity.
- Append-only behavior.
- Changed block data.
- Broken links.
- Removed or reordered blocks.
- Malformed blocks.
- Valid signatures.
- Invalid signatures.
- Wrong public keys.
- Merkle batches with zero, one, two, and odd numbers of leaves.
- Changed leaves and invalid proofs.
- Sensitive-data leakage.

## Definition Of Done

A blockchain task is complete only when:

- The implementation is covered by focused tests.
- The chain rejects tampering.
- Signatures and hashes verify correctly.
- No medical data is serialized or broadcast through the blockchain.
- The code remains independent from the SQL journal model.
- The relevant GitHub card is updated.
- The README documents setup, tests, key configuration, and verification behavior.
- The change has been reviewed through a pull request before merging to `main`.

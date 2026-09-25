import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import Blockchain from "../src/blockchain/blockchain.js";
import { PeerNode } from "../src/p2p/peer-node.js";
import { createHandshake, verifyHandshake } from "../src/p2p/handshake.js";

const signature =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

class MockSocket extends EventEmitter {
  connect(otherSocket) {
    this.otherSocket = otherSocket;
    otherSocket.otherSocket = this;
  }

  emit(eventName, payload) {
    if (eventName === "p2p:message") {
      return super.emit.call(this.otherSocket, eventName, payload);
    }
    return super.emit(eventName, payload);
  }
}

function appendBlocks(blockchain, count) {
  for (let index = 0; index < count; index += 1) {
    blockchain.appendBlock(
      blockchain.createBlock({
        event: { type: "journal.accessed", recordId: `opaque-${index}` },
        signature,
        timestamp: `2026-09-16T12:0${index}:00.000Z`,
      }),
    );
  }
}

test("replaces only a longer valid chain", () => {
  const local = new Blockchain();
  const remote = new Blockchain();
  appendBlocks(remote, 2);

  assert.equal(local.replaceChain(remote.getChain()), true);
  assert.equal(local.getChain().length, 3);
  assert.equal(local.replaceChain(remote.getChain()), false);

  const invalidChain = remote.getChain();
  invalidChain[2].previousHash = "tampered";
  assert.equal(local.replaceChain(invalidChain), false);
});

test("peers catch up through chain exchange and replicate new blocks", () => {
  const firstBlockchain = new Blockchain();
  const secondBlockchain = new Blockchain();
  appendBlocks(firstBlockchain, 1);

  const first = new PeerNode({
    blockchain: firstBlockchain,
    nodeId: "hospital-a",
  });
  const second = new PeerNode({
    blockchain: secondBlockchain,
    nodeId: "hospital-b",
  });
  const firstSocket = new MockSocket();
  const secondSocket = new MockSocket();
  firstSocket.connect(secondSocket);

  first.addPeer("hospital-b", firstSocket);
  second.addPeer("hospital-a", secondSocket);

  assert.equal(secondBlockchain.getChain().length, 2);

  const nextBlock = firstBlockchain.createBlock({
    event: { type: "journal.accessed", recordId: "opaque-next" },
    signature,
    timestamp: "2026-09-16T12:02:00.000Z",
  });
  firstBlockchain.appendBlock(nextBlock);
  first.broadcastBlock(nextBlock);

  assert.equal(secondBlockchain.getChain().length, 3);
  assert.equal(secondBlockchain.getLatestBlock().hash, nextBlock.hash);
});

test("malformed peer messages are rejected without changing the chain", () => {
  const blockchain = new Blockchain();
  const node = new PeerNode({ blockchain, nodeId: "hospital-a" });
  const socket = new MockSocket();
  const remoteSocket = new MockSocket();
  socket.connect(remoteSocket);
  const errors = [];
  node.on("sync:error", ({ error }) => errors.push(error));
  node.addPeer("hospital-b", socket);

  remoteSocket.emit("p2p:message", {
    version: 1,
    type: "chain.response",
    source: "hospital-b",
    payload: { chain: "not-a-chain" },
  });

  assert.equal(errors.length, 1);
  assert.equal(blockchain.getChain().length, 1);
});

test("removes peers when their socket closes", () => {
  const node = new PeerNode({
    blockchain: new Blockchain(),
    nodeId: "hospital-a",
  });
  const socket = new MockSocket();
  const remoteSocket = new MockSocket();
  socket.connect(remoteSocket);

  node.addPeer("hospital-b", socket);
  assert.deepEqual(node.getPeerIds(), ["hospital-b"]);

  socket.emit("close");

  assert.deepEqual(node.getPeerIds(), []);
});

test("authenticates a peer handshake and rejects tampering", () => {
  const firstKeys = generateKeyPairSync("ed25519");
  const handshake = createHandshake(
    "hospital-a",
    firstKeys.privateKey,
    firstKeys.publicKey,
  );

  assert.equal(verifyHandshake(handshake, firstKeys.publicKey), true);

  const tamperedHandshake = structuredClone(handshake);
  tamperedHandshake.payload.nodeId = "attacker";
  assert.equal(verifyHandshake(tamperedHandshake, firstKeys.publicKey), false);
});

test("rejects a handshake from an untrusted public key", () => {
  const firstKeys = generateKeyPairSync("ed25519");
  const trustedKeys = generateKeyPairSync("ed25519");
  const handshake = createHandshake(
    "hospital-a",
    firstKeys.privateKey,
    firstKeys.publicKey,
  );

  assert.equal(verifyHandshake(handshake, trustedKeys.publicKey), false);
});

test("restarted offline peer catches up from the persisted chain", () => {
  const directory = mkdtempSync(join(tmpdir(), "patient-journal-p2p-"));
  const firstPath = join(directory, "hospital-a.json");
  const secondPath = join(directory, "hospital-b.json");

  try {
    const firstBlockchain = new Blockchain({ storagePath: firstPath });
    appendBlocks(firstBlockchain, 2);

    const restartedSecondBlockchain = new Blockchain({
      storagePath: secondPath,
    });
    const first = new PeerNode({
      blockchain: firstBlockchain,
      nodeId: "hospital-a",
    });
    const second = new PeerNode({
      blockchain: restartedSecondBlockchain,
      nodeId: "hospital-b",
    });
    const firstSocket = new MockSocket();
    const secondSocket = new MockSocket();
    firstSocket.connect(secondSocket);

    second.addPeer("hospital-a", secondSocket);
    first.addPeer("hospital-b", firstSocket);
    second.requestSync("hospital-a");

    assert.deepEqual(
      restartedSecondBlockchain.getChain(),
      firstBlockchain.getChain(),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("broadcasts notes between connected peers without using the chain", () => {
  const first = new PeerNode({
    blockchain: new Blockchain(),
    nodeId: "hospital-a",
  });
  const second = new PeerNode({
    blockchain: new Blockchain(),
    nodeId: "hospital-b",
  });
  const firstSocket = new MockSocket();
  const secondSocket = new MockSocket();
  const received = [];
  firstSocket.connect(secondSocket);
  second.on("note:received", ({ note }) => received.push(note));

  first.addPeer("hospital-b", firstSocket);
  second.addPeer("hospital-a", secondSocket);
  const note = {
    id: 1,
    patient_id: 1,
    author_user_id: 7,
    content: "Visible note",
    visibility: "all",
  };

  first.broadcastNote(note);

  assert.deepEqual(received, [note]);
  assert.equal(second.getPeerIds().length, 1);
});

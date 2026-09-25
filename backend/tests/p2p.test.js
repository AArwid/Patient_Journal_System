import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import Blockchain from "../src/blockchain/blockchain.js";
import { PeerNode } from "../src/p2p/peer-node.js";

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

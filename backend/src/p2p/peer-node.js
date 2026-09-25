import { EventEmitter } from "node:events";

import { MESSAGE_TYPES, createMessage, parseMessage } from "./protocol.js";
import {
  HANDSHAKE_TYPE,
  createHandshake,
  verifyHandshake,
} from "./handshake.js";

const P2P_EVENT = "p2p:message";

function sendOnSocket(socket, message) {
  if (typeof socket.emit === "function" && typeof socket.send !== "function") {
    socket.emit(P2P_EVENT, message);
    return;
  }

  if (typeof socket.send === "function") {
    socket.send(JSON.stringify(message));
    return;
  }

  throw new TypeError("Peer socket must support emit or send");
}

function listenOnSocket(socket, handler) {
  if (typeof socket.on !== "function") {
    throw new TypeError("Peer socket must support on");
  }

  if (typeof socket.send === "function") {
    socket.on("message", handler);
  } else {
    socket.on(P2P_EVENT, handler);
  }
}

class PeerNode extends EventEmitter {
  #blockchain;
  #publicKey;
  #trustedPublicKeys;
  #nodeId;
  #maxMessageBytes;
  #privateKey;
  #peers = new Map();

  constructor({
    blockchain,
    nodeId,
    publicKey,
    trustedPublicKeys,
    privateKey,
    maxMessageBytes = 1_000_000,
  }) {
    super();
    if (!blockchain || typeof blockchain.getChain !== "function") {
      throw new TypeError("A blockchain instance is required");
    }
    if (typeof nodeId !== "string" || nodeId.length === 0) {
      throw new TypeError("nodeId must be a non-empty string");
    }

    this.#blockchain = blockchain;
    this.#publicKey = publicKey;
    this.#trustedPublicKeys = trustedPublicKeys;
    this.#nodeId = nodeId;
    this.#maxMessageBytes = maxMessageBytes;
    this.#privateKey = privateKey;
  }

  addPeer(peerId, socket) {
    if (typeof peerId !== "string" || peerId.length === 0) {
      throw new TypeError("peerId must be a non-empty string");
    }

    const peer = {
      socket,
      peerId,
      authenticated: !this.#privateKey || !this.#publicKey,
    };
    this.#peers.set(peerId, peer);
    listenOnSocket(socket, (rawMessage) => {
      this.#handleMessage(peer, rawMessage);
    });
    socket.on?.("close", () => this.removePeer(peerId));
    socket.on?.("error", (error) => {
      this.emit("sync:error", { peerId, error });
      this.removePeer(peerId);
    });

    if (peer.authenticated) this.#requestChain(peer);
    else this.#sendHandshake(peer);
    this.emit("peer:connected", { peerId });
    return () => this.removePeer(peerId);
  }

  removePeer(peerId) {
    const removed = this.#peers.delete(peerId);
    if (removed) {
      this.emit("peer:disconnected", { peerId });
    }
    return removed;
  }

  broadcastBlock(block, exceptPeerId) {
    for (const peer of this.#peers.values()) {
      if (peer.peerId !== exceptPeerId) {
        this.#send(peer, MESSAGE_TYPES.BLOCK_BROADCAST, { block });
      }
    }
  }

  broadcastNote(note, exceptPeerId) {
    for (const peer of this.#peers.values()) {
      if (peer.peerId !== exceptPeerId) {
        this.#send(peer, MESSAGE_TYPES.NOTE_BROADCAST, { note });
      }
    }
  }

  requestSync(peerId) {
    const peer = this.#peers.get(peerId);
    if (!peer) {
      throw new Error(`Unknown peer: ${peerId}`);
    }
    this.#send(peer, MESSAGE_TYPES.CHAIN_REQUEST, {});
  }

  getPeerIds() {
    return [...this.#peers.keys()];
  }

  #send(peer, type, payload) {
    if (!peer.authenticated) return;
    sendOnSocket(peer.socket, createMessage(type, payload, this.#nodeId));
  }

  #sendHandshake(peer) {
    sendOnSocket(
      peer.socket,
      createHandshake(this.#nodeId, this.#privateKey, this.#publicKey),
    );
  }

  #requestChain(peer) {
    this.#send(peer, MESSAGE_TYPES.CHAIN_REQUEST, {});
  }

  #handleMessage(peer, rawMessage) {
    try {
      const message = parseMessage(rawMessage, this.#maxMessageBytes);
      if (message.source === this.#nodeId) {
        return;
      }

      if (message.type === HANDSHAKE_TYPE) {
        this.#handleHandshake(peer, message);
        return;
      }
      if (!peer.authenticated) {
        throw new Error("Peer handshake required");
      }

      switch (message.type) {
        case MESSAGE_TYPES.CHAIN_REQUEST:
          this.#send(peer, MESSAGE_TYPES.CHAIN_RESPONSE, {
            chain: this.#blockchain.getChain(),
          });
          break;
        case MESSAGE_TYPES.CHAIN_RESPONSE:
          this.#handleChainResponse(peer, message.payload, message.source);
          break;
        case MESSAGE_TYPES.BLOCK_BROADCAST:
          this.#handleBlock(peer, message.payload, message.source);
          break;
        case MESSAGE_TYPES.NOTE_BROADCAST:
          this.#handleNote(peer, message.payload);
          break;
        default:
          throw new TypeError("Unsupported P2P message type");
      }
    } catch (error) {
      this.emit("sync:error", { peerId: peer.peerId, error });
    }
  }

  #handleHandshake(peer, message) {
    const trustedKey = this.#trustedPublicKeys?.[message.source];
    if (this.#privateKey && !trustedKey) {
      throw new Error(
        `No trusted public key configured for peer: ${message.source}`,
      );
    }
    if (!verifyHandshake(message, trustedKey)) {
      throw new Error(`Peer handshake failed: ${message.source}`);
    }
    peer.authenticated = true;
    this.emit("peer:authenticated", {
      peerId: peer.peerId,
      source: message.source,
    });
    this.#requestChain(peer);
  }

  #handleChainResponse(peer, payload, source) {
    if (!payload || !Array.isArray(payload.chain)) {
      throw new TypeError("Chain response must contain a chain array");
    }

    const replaced = this.#blockchain.replaceChain(
      payload.chain,
      this.#publicKeyFor(peer.peerId, source),
    );
    this.emit(replaced ? "chain:replaced" : "chain:unchanged", {
      peerId: peer.peerId,
      length: payload.chain.length,
    });
  }

  #handleBlock(peer, payload, source) {
    if (!payload || !payload.block) {
      throw new TypeError("Block broadcast must contain a block");
    }

    try {
      this.#blockchain.appendBlock(
        payload.block,
        this.#publicKeyFor(peer.peerId, source),
      );
      this.emit("block:appended", {
        peerId: peer.peerId,
        block: payload.block,
      });
      this.broadcastBlock(payload.block, peer.peerId);
    } catch (error) {
      this.emit("block:deferred", { peerId: peer.peerId, error });
      this.requestSync(peer.peerId);
    }
  }

  #handleNote(peer, payload) {
    if (!payload?.note || typeof payload.note !== "object") {
      throw new TypeError("Note broadcast must contain a note");
    }
    this.emit("note:received", { peerId: peer.peerId, note: payload.note });
    this.broadcastNote(payload.note, peer.peerId);
  }

  #publicKeyFor(peerId, source) {
    if (!this.#trustedPublicKeys) return this.#publicKey;

    const publicKey = this.#trustedPublicKeys[source];
    if (!publicKey) {
      throw new Error(`No trusted public key configured for peer: ${source}`);
    }
    return publicKey;
  }
}

export { P2P_EVENT, PeerNode };

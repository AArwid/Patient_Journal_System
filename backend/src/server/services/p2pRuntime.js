const { WebSocketServer, WebSocket } = require("ws");
const { createPublicKey } = require("node:crypto");
const { readFileSync } = require("node:fs");
const auditChainClient = require("./auditChainClient");
const broadcastClient = require("./broadcastClient");

function toWebSocketUrl(value) {
  const url = new URL(value);
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  if (!url.pathname || url.pathname === "/") url.pathname = "/p2p";
  return url.toString();
}

async function createP2PRuntime({
  server,
  nodeId,
  peerUrls,
  peerPublicKeys = {},
  reconnectDelayMs = 1_000,
  maxReconnectDelayMs = 10_000,
}) {
  const [{ PeerNode }, blockchain, signingKeys] = await Promise.all([
    import("../../p2p/index.js"),
    auditChainClient.getBlockchain(),
    auditChainClient.getSigningKeys(),
  ]);
  const trustedPublicKeys = Object.fromEntries(
    Object.entries(peerPublicKeys).map(([peerId, publicKeyPath]) => [
      peerId,
      createPublicKey(readFileSync(publicKeyPath)),
    ]),
  );
  const node = new PeerNode({
    blockchain,
    nodeId,
    privateKey: signingKeys.privateKey,
    publicKey: signingKeys.publicKey,
    trustedPublicKeys:
      Object.keys(trustedPublicKeys).length > 0 ? trustedPublicKeys : undefined,
  });
  node.on("note:received", ({ peerId, note }) => {
    // Metadata only - journal content must never reach the logs.
    console.log(
      `[${nodeId}] note #${note.id} (${note.visibility}) received from ${peerId}`,
    );
    broadcastClient.receivePeerNote(note);
  });
  node.on("note:withheld", ({ visibility }) => {
    console.log(`[${nodeId}] note withheld from peers (${visibility})`);
  });
  node.on("peer:authenticated", ({ source }) => {
    console.log(`[${nodeId}] peer authenticated: ${source}`);
  });
  node.on("block:appended", ({ peerId, block }) => {
    console.log(`[${nodeId}] audit block #${block.index} from ${peerId}`);
  });
  node.on("block:deferred", ({ peerId, error }) => {
    console.warn(
      `[${nodeId}] block from ${peerId} deferred, resyncing: ${error.message}`,
    );
  });
  node.on("chain:replaced", ({ peerId, length }) => {
    console.log(`[${nodeId}] chain replaced from ${peerId} (${length} blocks)`);
  });
  node.on("sync:error", ({ peerId, error }) => {
    console.warn(`[${nodeId}] sync error from ${peerId}: ${error.message}`);
  });
  const webSocketServer = new WebSocketServer({ server, path: "/p2p" });
  const sockets = new Set();
  const reconnectTimers = new Set();
  let stopped = false;
  let inboundPeerCount = 0;

  function scheduleReconnect(peerUrl, attempt) {
    if (stopped) return;

    const delay = Math.min(
      maxReconnectDelayMs,
      reconnectDelayMs * 2 ** Math.min(attempt, 10),
    );
    const timer = setTimeout(() => {
      reconnectTimers.delete(timer);
      connectOutbound(peerUrl, attempt);
    }, delay);
    reconnectTimers.add(timer);
  }

  function connectOutbound(peerUrl, attempt = 0) {
    if (stopped) return;

    const socket = new WebSocket(toWebSocketUrl(peerUrl));
    let registered = false;
    sockets.add(socket);

    socket.once("open", () => {
      if (stopped) {
        socket.close();
        return;
      }
      registered = true;
      node.addPeer(peerUrl, socket);
    });
    socket.once("error", (error) => {
      node.emit("sync:error", { peerId: peerUrl, error });
      socket.close();
    });
    socket.once("close", () => {
      sockets.delete(socket);
      if (registered) node.removePeer(peerUrl);
      scheduleReconnect(peerUrl, attempt + 1);
    });
  }

  webSocketServer.on("connection", (socket) => {
    sockets.add(socket);
    const peerId = `inbound-${++inboundPeerCount}`;
    node.addPeer(peerId, socket);
    socket.on("close", () => sockets.delete(socket));
  });

  for (const peerUrl of peerUrls) {
    connectOutbound(peerUrl);
  }

  return {
    broadcastAccessEvent(block) {
      node.broadcastBlock(block);
    },
    broadcastNote(note) {
      node.broadcastNote(note);
    },
    close() {
      stopped = true;
      for (const timer of reconnectTimers) clearTimeout(timer);
      reconnectTimers.clear();
      for (const socket of sockets) socket.close();
      webSocketServer.close();
    },
    node,
  };
}

module.exports = { createP2PRuntime };

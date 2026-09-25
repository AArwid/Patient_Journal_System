const { WebSocketServer, WebSocket } = require("ws");
const auditChainClient = require("./auditChainClient");

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
  reconnectDelayMs = 1_000,
  maxReconnectDelayMs = 10_000,
}) {
  const [{ PeerNode }, blockchain] = await Promise.all([
    import("../../p2p/index.js"),
    auditChainClient.getBlockchain(),
  ]);
  const node = new PeerNode({ blockchain, nodeId });
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

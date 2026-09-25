const { WebSocketServer, WebSocket } = require("ws");
const auditChainClient = require("./auditChainClient");

function toWebSocketUrl(value) {
  const url = new URL(value);
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  if (!url.pathname || url.pathname === "/") url.pathname = "/p2p";
  return url.toString();
}

async function createP2PRuntime({ server, nodeId, peerUrls }) {
  const [{ PeerNode }, blockchain] = await Promise.all([
    import("../../../backend/src/p2p/index.js"),
    auditChainClient.getBlockchain(),
  ]);
  const node = new PeerNode({ blockchain, nodeId });
  const webSocketServer = new WebSocketServer({ server, path: "/p2p" });
  const sockets = new Set();

  webSocketServer.on("connection", (socket) => {
    sockets.add(socket);
    node.addPeer(`inbound-${sockets.size}`, socket);
    socket.on("close", () => sockets.delete(socket));
  });

  for (const peerUrl of peerUrls) {
    const socket = new WebSocket(toWebSocketUrl(peerUrl));
    sockets.add(socket);
    socket.once("open", () => {
      node.addPeer(peerUrl, socket);
    });
    socket.on("close", () => sockets.delete(socket));
  }

  return {
    broadcastAccessEvent(block) {
      node.broadcastBlock(block);
    },
    close() {
      for (const socket of sockets) socket.close();
      webSocketServer.close();
    },
    node,
  };
}

module.exports = { createP2PRuntime };

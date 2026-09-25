const app = require("./app");
const config = require("./config");
const http = require("http");
const broadcastClient = require("./services/broadcastClient");
const { createP2PRuntime } = require("./services/p2pRuntime");

const server = http.createServer(app);

server.listen(config.port, async () => {
  const p2p = await createP2PRuntime({
    server,
    nodeId: config.serverId,
    peerUrls: config.peerUrls,
  });
  broadcastClient.setP2PTransport(p2p);
  console.log(
    `[${config.serverId}] Patient Journal API listening on http://localhost:${config.port}`,
  );
  console.log(
    `[${config.serverId}] P2P WebSocket listening on ws://localhost:${config.port}/p2p`,
  );
});

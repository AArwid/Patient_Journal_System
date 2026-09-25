const { EventEmitter } = require("events");

const bus = new EventEmitter();
let p2pTransport = null;

function setP2PTransport(transport) {
  p2pTransport = transport;
}

function broadcastAccessEvent(block) {
  bus.emit("access-event", block);
  p2pTransport?.broadcastAccessEvent(block);
}

function broadcastNote(note) {
  bus.emit("note", note);
}

function onAccessEvent(handler) {
  bus.on("access-event", handler);
}

function onNote(handler) {
  bus.on("note", handler);
}

module.exports = {
  broadcastAccessEvent,
  broadcastNote,
  onAccessEvent,
  onNote,
  setP2PTransport,
};

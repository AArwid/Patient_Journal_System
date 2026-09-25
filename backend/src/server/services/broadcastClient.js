const { EventEmitter } = require("events");

const bus = new EventEmitter();
let p2pTransport = null;

function isNoteVisible(note, viewer) {
  if (!viewer || note.visibility === "all") return true;
  if (note.visibility === "private") return note.author_user_id === viewer.id;
  return (
    note.visibility === "staff" &&
    ["doctor", "nurse", "clinic"].includes(viewer.role)
  );
}

function setP2PTransport(transport) {
  p2pTransport = transport;
}

function broadcastAccessEvent(block) {
  bus.emit("access-event", block);
  p2pTransport?.broadcastAccessEvent(block);
}

function broadcastNote(note) {
  bus.emit("note", note);
  p2pTransport?.broadcastNote(note);
}

function receivePeerNote(note) {
  bus.emit("note", note);
}

function onAccessEvent(handler) {
  bus.on("access-event", handler);
}

function onNote(handler, viewer) {
  bus.on("note", (note) => {
    if (isNoteVisible(note, viewer)) handler(note);
  });
}

module.exports = {
  broadcastAccessEvent,
  broadcastNote,
  onAccessEvent,
  onNote,
  receivePeerNote,
  isNoteVisible,
  setP2PTransport,
};

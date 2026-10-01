const { EventEmitter } = require("events");
const { STAFF_ROLES } = require("../constants/roles");

const bus = new EventEmitter();
let p2pTransport = null;

// Mirrors REPLICABLE_NOTE_VISIBILITIES in ../../p2p/protocol.js, which cannot be
// required from here because the P2P layer is ESM.
const REPLICABLE_VISIBILITIES = ["staff", "all"];

function isReplicableNote(note) {
  return Boolean(note) && REPLICABLE_VISIBILITIES.includes(note.visibility);
}

// Decides what a single subscriber is allowed to receive. This mirrors
// notes.repository.findVisibleForPatient, but the live path has no route guard
// in front of it, so it must also check that a patient owns the record.
function isNoteVisible(note, viewer) {
  if (!note) return false;
  // No identity attached (internal subscriber): only fully public notes.
  if (!viewer) return note.visibility === "all";

  if (note.visibility === "private") {
    return note.author_user_id === viewer.id;
  }

  if (STAFF_ROLES.includes(viewer.role)) {
    return note.visibility === "staff" || note.visibility === "all";
  }

  if (viewer.role === "patient") {
    return note.visibility === "all" && note.patient_id === viewer.patientId;
  }

  return false;
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
  if (isReplicableNote(note)) p2pTransport?.broadcastNote(note);
}

function receivePeerNote(note) {
  if (!isReplicableNote(note)) return;
  bus.emit("note", note);
}

function onAccessEvent(handler) {
  bus.on("access-event", handler);
}

// Returns an unsubscribe function - callers with a lifetime shorter than the
// process (an SSE connection, say) must call it when done or the listener
// leaks for as long as the server runs.
function onNote(handler, viewer) {
  const wrapped = (note) => {
    if (isNoteVisible(note, viewer)) handler(note);
  };
  bus.on("note", wrapped);
  return () => bus.off("note", wrapped);
}

module.exports = {
  broadcastAccessEvent,
  broadcastNote,
  onAccessEvent,
  onNote,
  receivePeerNote,
  isNoteVisible,
  isReplicableNote,
  setP2PTransport,
};

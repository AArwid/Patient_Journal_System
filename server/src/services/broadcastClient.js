// Adapter between the Express API and the P2P/Socket.IO layer (Ahmed's part).
// Until real server-to-server sockets exist, this is a local no-op event bus
// so routes can call it unconditionally without knowing whether the P2P
// layer is wired up yet.
//
// Contract to preserve when wiring in the real Socket.IO/P2P module:
//   broadcastAccessEvent(block) -> void   // a new audit block was appended
//   broadcastNote(note)         -> void   // a note was created, incl. its visibility
//   onAccessEvent(handler)      -> void   // subscribe to blocks from peers
//   onNote(handler)             -> void   // subscribe to notes from peers
//
// IMPORTANT: broadcastNote sends the full note, visibility field included -
// it does NOT decide who may see it. The receiving P2P/socket layer must
// only forward it to a connected client whose session role/identity passes
// the same visibility check as notesRepository.findVisibleForPatient
// (private -> author only, staff -> doctor/nurse/clinic, all -> everyone).
// Never push a private/staff note straight to a patient's browser.

const { EventEmitter } = require('events');

const bus = new EventEmitter();

function broadcastAccessEvent(block) {
  bus.emit('access-event', block);
}

function broadcastNote(note) {
  bus.emit('note', note);
}

function onAccessEvent(handler) {
  bus.on('access-event', handler);
}

function onNote(handler) {
  bus.on('note', handler);
}

module.exports = { broadcastAccessEvent, broadcastNote, onAccessEvent, onNote };

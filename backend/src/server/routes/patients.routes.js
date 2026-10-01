const express = require("express");
const patientsRepository = require("../db/patients.repository");
const notesRepository = require("../db/notes.repository");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const requirePatientAccess = require("../middleware/requirePatientAccess");
const auditLogger = require("../middleware/auditLogger");
const auditChainClient = require("../services/auditChainClient");
const broadcastClient = require("../services/broadcastClient");
const { STAFF_ROLES } = require("../constants/roles");

const router = express.Router();

// The server resolves who was being looked for even when the search is refused,
// so a snooping attempt still surfaces in that patient's own access trail.
function resolveSearchTarget(req) {
  const query = String(req.query.q || "").trim();
  if (!query) return null;

  const matches = patientsRepository.search(query);
  return matches.length === 1 ? matches[0].id : null;
}

// Staff-only patient search. Patients never search - they're routed straight
// to their own record - and 'unauthorized' has no business here at all.
router.get(
  "/",
  requireAuth,
  auditLogger("search_patients", resolveSearchTarget),
  requireRole(...STAFF_ROLES),
  (req, res) => {
    const query = String(req.query.q || "").trim();
    if (!query) return res.json({ patients: [] });
    res.json({ patients: patientsRepository.search(query) });
  },
);

router.get(
  "/:id",
  auditLogger("view_journal"),
  requirePatientAccess,
  (req, res) => {
    const patient = patientsRepository.findById(Number(req.params.id));
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json({ patient });
  },
);

router.get(
  "/:id/notes",
  auditLogger("view_notes"),
  requirePatientAccess,
  (req, res) => {
    const notes = notesRepository.findVisibleForPatient(
      Number(req.params.id),
      req.session.user,
    );
    res.json({ notes });
  },
);

// Server-Sent Events stream: pushes a note to an open browser tab the moment
// it's created - on this server directly, or synced in from the other server
// over the P2P layer - without the client having to poll or refresh. Same
// access check as the other patient routes; broadcastClient.onNote applies
// the same visibility rule as findVisibleForPatient on top of that.
router.get("/:id/notes/stream", requirePatientAccess, (req, res) => {
  const patientId = Number(req.params.id);

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const unsubscribe = broadcastClient.onNote((note) => {
    if (note.patient_id !== patientId) return;
    res.write(`data: ${JSON.stringify(note)}\n\n`);
  }, req.session.user);

  // Keeps intermediary proxies/browsers from timing out an idle connection.
  const heartbeat = setInterval(() => res.write(":\n\n"), 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

router.post(
  "/:id/notes",
  auditLogger("create_note"),
  requirePatientAccess,
  (req, res) => {
    const { content, visibility } = req.body;
    if (!content || !["private", "staff", "all"].includes(visibility)) {
      return res
        .status(400)
        .json({ error: "content and a valid visibility are required" });
    }

    const note = notesRepository.create({
      patientId: Number(req.params.id),
      authorUserId: req.session.user.id,
      content,
      visibility,
    });

    broadcastClient.broadcastNote(note);
    res.status(201).json({ note });
  },
);

router.get(
  "/:id/access-logs",
  auditLogger("view_access_logs"),
  requirePatientAccess,
  async (req, res) => {
    const logs = await auditChainClient.getChainForPatient(
      Number(req.params.id),
    );
    res.json({ logs });
  },
);

module.exports = router;

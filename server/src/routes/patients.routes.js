const express = require('express');
const patientsRepository = require('../db/patients.repository');
const notesRepository = require('../db/notes.repository');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const requirePatientAccess = require('../middleware/requirePatientAccess');
const auditLogger = require('../middleware/auditLogger');
const auditChainClient = require('../services/auditChainClient');
const broadcastClient = require('../services/broadcastClient');
const { STAFF_ROLES } = require('../constants/roles');

const router = express.Router();

// Staff-only patient search. Patients never search - they're routed straight
// to their own record - and 'unauthorized' has no business here at all.
router.get('/', requireAuth, requireRole(...STAFF_ROLES), (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.json({ patients: [] });
  res.json({ patients: patientsRepository.search(query) });
});

router.get('/:id', auditLogger('view_journal'), requirePatientAccess, (req, res) => {
  const patient = patientsRepository.findById(Number(req.params.id));
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json({ patient });
});

router.get('/:id/notes', auditLogger('view_notes'), requirePatientAccess, (req, res) => {
  const notes = notesRepository.findVisibleForPatient(Number(req.params.id), req.session.user);
  res.json({ notes });
});

router.post('/:id/notes', auditLogger('create_note'), requirePatientAccess, (req, res) => {
  const { content, visibility } = req.body;
  if (!content || !['private', 'staff', 'all'].includes(visibility)) {
    return res.status(400).json({ error: 'content and a valid visibility are required' });
  }

  const note = notesRepository.create({
    patientId: Number(req.params.id),
    authorUserId: req.session.user.id,
    content,
    visibility,
  });

  broadcastClient.broadcastNote(note);
  res.status(201).json({ note });
});

router.get('/:id/access-logs', auditLogger('view_access_logs'), requirePatientAccess, async (req, res) => {
  const logs = await auditChainClient.getChainForPatient(Number(req.params.id));
  res.json({ logs });
});

module.exports = router;

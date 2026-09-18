const express = require('express');
const patientsRepository = require('../db/patients.repository');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const requirePatientAccess = require('../middleware/requirePatientAccess');
const { STAFF_ROLES } = require('../constants/roles');

const router = express.Router();

// Staff-only patient search. Patients never search - they're routed straight
// to their own record - and 'unauthorized' has no business here at all.
router.get('/', requireAuth, requireRole(...STAFF_ROLES), (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.json({ patients: [] });
  res.json({ patients: patientsRepository.search(query) });
});

router.get('/:id', requirePatientAccess, (req, res) => {
  const patient = patientsRepository.findById(Number(req.params.id));
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json({ patient });
});

module.exports = router;

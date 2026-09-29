const { STAFF_ROLES } = require('../constants/roles');

// The core "can't manipulate the URL to see someone else's data" guard.
// A patient may only ever reach the :id that matches their own session -
// never a client-supplied claim - and 'unauthorized' never reaches any patient.
function requirePatientAccess(req, res, next) {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const requestedPatientId = Number(req.params.id);

  if (STAFF_ROLES.includes(user.role)) {
    return next();
  }

  if (user.role === 'patient' && user.patientId === requestedPatientId) {
    return next();
  }

  return res.status(403).json({ error: 'Access denied' });
}

module.exports = requirePatientAccess;

const auditChainClient = require('../services/auditChainClient');
const broadcastClient = require('../services/broadcastClient');
const config = require('../config');

// "avlyssnar automatiskt databas-access, signerar händelsen och utvinner ett
// block": hooks into the response lifecycle so it fires for every request
// through this route - both the ones that succeed (outcome: granted) and the
// ones a later middleware rejects with 401/403 (outcome: denied). That way a
// nosy/unauthorized access attempt still ends up in the tamper-evident log.
function auditLogger(actionType) {
  return (req, res, next) => {
    res.on('finish', () => {
      const user = req.session.user;
      if (!user) return; // no identity to attribute the event to

      const outcome = res.statusCode < 400 ? 'granted' : 'denied';
      const patientId = req.params.id ? Number(req.params.id) : null;

      auditChainClient
        .recordEvent({
          type: actionType,
          outcome,
          patientId,
          actorId: user.id,
          actorRole: user.role,
          serverId: config.serverId,
        })
        .then((block) => broadcastClient.broadcastAccessEvent(block))
        .catch((err) => {
          console.error('[auditLogger] failed to record access event', err);
        });
    });
    next();
  };
}

module.exports = auditLogger;

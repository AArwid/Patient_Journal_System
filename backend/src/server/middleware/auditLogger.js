const auditChainClient = require("../services/auditChainClient");
const broadcastClient = require("../services/broadcastClient");
const config = require("../config");

// "avlyssnar automatiskt databas-access, signerar händelsen och utvinner ett
// block": hooks into the response lifecycle so it fires for every request
// through this route - both the ones that succeed (outcome: granted) and the
// ones a later middleware rejects with 401/403 (outcome: denied). That way a
// nosy/unauthorized access attempt still ends up in the tamper-evident log.
//
// resolvePatientId lets routes without an :id param (a search, say) still say
// which patient was targeted, so the attempt shows up in that patient's trail.
function auditLogger(actionType, resolvePatientId) {
  const resolve =
    resolvePatientId ||
    ((req) => (req.params.id ? Number(req.params.id) : null));

  return (req, res, next) => {
    res.on("finish", () => {
      const user = req.session.user;
      if (!user) return; // no identity to attribute the event to

      const outcome = res.statusCode < 400 ? "granted" : "denied";

      let patientId = null;
      try {
        patientId = resolve(req);
      } catch (err) {
        console.error(
          "[auditLogger] could not resolve the targeted patient",
          err,
        );
      }

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
          console.error("[auditLogger] failed to record access event", err);
        });
    });
    next();
  };
}

module.exports = auditLogger;

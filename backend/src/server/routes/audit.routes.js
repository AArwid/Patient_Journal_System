const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const auditChainClient = require("../services/auditChainClient");

const router = express.Router();

// Scoped to the caller's own events on purpose: an 'unauthorized' user must be
// able to see that their denied attempt was recorded, without that becoming a
// way to read a patient's access trail.
router.get("/my-events", requireAuth, async (req, res) => {
  const logs = await auditChainClient.getChainForActor(req.session.user.id);
  res.json({ logs });
});

module.exports = router;

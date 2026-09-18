const express = require('express');
const usersRepository = require('../db/users.repository');
const { verifyPassword } = require('../utils/password');

const router = express.Router();

function toSessionUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    patientId: user.patient_id,
  };
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = usersRepository.findByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.user = toSessionUser(user);
  res.json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.session.user });
});

module.exports = router;

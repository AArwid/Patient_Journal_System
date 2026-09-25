const express = require('express');
const cors = require('cors');
const session = require('express-session');
const config = require('./config');
const authRoutes = require('./routes/auth.routes');
const patientsRoutes = require('./routes/patients.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);
app.use(
  session({
    name: 'connect.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // Only over HTTPS in real deployments; the assignment runs locally over HTTP.
      secure: false,
    },
  })
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverId: config.serverId });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);

// Notes routes are mounted onto /api/patients in a follow-up PR.

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

module.exports = app;

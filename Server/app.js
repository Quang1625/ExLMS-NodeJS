const express = require('express');
const cors = require('cors');
const path = require('path');

const routes = require('../src/routes');
const { notFound, errorHandler } = require('../src/middleware/errorHandler');

const app = express();

// ── Core Middleware ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Error Handlers ─────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;

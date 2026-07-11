'use strict';

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { notFoundHandler, generalErrorHandler } = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10kb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.originalUrl === '/api/health',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

const cacheControl = process.env.NODE_ENV === 'production'
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';

app.use(
  express.static(path.join(__dirname, '../frontend'), {
    setHeaders(res) {
      res.setHeader('Cache-Control', cacheControl);
    },
  }),
);

app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));

app.use(notFoundHandler);
app.use(generalErrorHandler);

if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.info('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err.message));
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.info(`Alpha Chat running on port ${PORT}`));
}

module.exports = app;

'use strict';

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: `Cannot ${req.method} ${req.originalUrl}` });
}

function generalErrorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`${req.method} ${req.originalUrl}`, err.stack);
  }
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';
  res.status(statusCode).json({ success: false, error: message });
}

module.exports = { notFoundHandler, generalErrorHandler };

// src/middleware/errorHandler.js
const { error: sendError } = require('../utils/response');

/**
 * 404 handler — mount AFTER all routes
 */
const notFound = (req, res) => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

/**
 * Global error handler — mount last
 */
// eslint-disable-next-line no-unused-vars
const globalError = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Postgres unique constraint
  if (err.code === '23505') {
    const match = err.detail?.match(/Key \((.+)\)=/);
    const field = match ? match[1] : 'field';
    return sendError(res, `${field} already exists`, 409);
  }

  // Postgres foreign key violation
  if (err.code === '23503') {
    return sendError(res, 'Referenced resource does not exist', 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  sendError(res, message, statusCode);
};

module.exports = { notFound, globalError };

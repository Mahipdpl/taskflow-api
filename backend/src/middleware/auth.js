// src/middleware/auth.js
const { verifyAccessToken } = require('../utils/jwt');
const { error } = require('../utils/response');
const { query } = require('../config/database');

/**
 * Authenticate: verify JWT and attach user to req
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'No token provided. Authorization header must be: Bearer <token>', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Load fresh user from DB (ensures deactivated users are blocked)
    const { rows } = await query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.sub]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return error(res, 'User not found or account deactivated', 401);
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token expired. Please refresh your token.', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return error(res, 'Invalid token', 401);
    }
    return error(res, 'Authentication failed', 401);
  }
};

/**
 * Authorize: restrict to specific roles
 * Usage: authorize('admin') or authorize('admin', 'user')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Not authenticated', 401);
    }
    if (!roles.includes(req.user.role)) {
      return error(
        res,
        `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
        403
      );
    }
    next();
  };
};

/**
 * Resource owner check — user can only access their own resources,
 * unless they are admin.
 */
const ownerOrAdmin = (userIdField = 'user_id') => {
  return (req, res, next) => {
    if (!req.user) return error(res, 'Not authenticated', 401);

    const resourceOwnerId = req.resource?.[userIdField];
    const isOwner = resourceOwnerId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return error(res, 'Forbidden: you do not own this resource', 403);
    }
    next();
  };
};

module.exports = { authenticate, authorize, ownerOrAdmin };

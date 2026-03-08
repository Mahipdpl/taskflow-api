// src/utils/jwt.js
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const ACCESS_SECRET  = process.env.JWT_SECRET || 'dev_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';
const ACCESS_EXP     = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate an access token (short-lived)
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXP,
    issuer: 'taskflow-api',
    audience: 'taskflow-client',
  });
};

/**
 * Generate a refresh token and persist it to DB
 */
const generateRefreshToken = async (userId) => {
  const token = jwt.sign({ sub: userId, jti: uuidv4() }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXP,
    issuer: 'taskflow-api',
  });

  // Persist token in DB for revocation support
  const decoded = jwt.decode(token);
  await query(
    'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, to_timestamp($3))',
    [token, userId, decoded.exp]
  );

  return token;
};

/**
 * Verify and decode an access token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET, {
    issuer: 'taskflow-api',
    audience: 'taskflow-client',
  });
};

/**
 * Verify refresh token and check DB
 */
const verifyRefreshToken = async (token) => {
  const decoded = jwt.verify(token, REFRESH_SECRET, { issuer: 'taskflow-api' });

  // Ensure token still exists (not revoked)
  const { rows } = await query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );

  if (rows.length === 0) {
    throw new Error('Refresh token revoked or expired');
  }

  return decoded;
};

/**
 * Revoke a specific refresh token
 */
const revokeRefreshToken = async (token) => {
  await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
};

/**
 * Revoke all refresh tokens for a user (logout everywhere)
 */
const revokeAllUserTokens = async (userId) => {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};

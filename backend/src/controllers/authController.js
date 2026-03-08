// src/controllers/authController.js
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} = require('../utils/jwt');
const { success, error } = require('../utils/response');

/**
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check duplicate email
    const existing = await User.findByEmail(email);
    if (existing) {
      return error(res, 'Email is already registered', 409);
    }

    const user = await User.create({ name, email, password, role: 'user' });

    const accessToken  = generateAccessToken({ sub: user.id, role: user.role });
    const refreshToken = await generateRefreshToken(user.id);

    return success(
      res,
      { user, accessToken, refreshToken },
      'Registration successful',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Generic message to prevent user enumeration
      return error(res, 'Invalid email or password', 401);
    }

    if (!user.is_active) {
      return error(res, 'Account deactivated. Please contact support.', 403);
    }

    const valid = await User.verifyPassword(password, user.password);
    if (!valid) {
      return error(res, 'Invalid email or password', 401);
    }

    const { password: _, ...safeUser } = user;
    const accessToken  = generateAccessToken({ sub: user.id, role: user.role });
    const refreshToken = await generateRefreshToken(user.id);

    return success(res, { user: safeUser, accessToken, refreshToken }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token required', 400);

    const decoded = await verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.sub);
    if (!user || !user.is_active) {
      return error(res, 'User not found or deactivated', 401);
    }

    // Rotate token
    await revokeRefreshToken(refreshToken);
    const newAccessToken  = generateAccessToken({ sub: user.id, role: user.role });
    const newRefreshToken = await generateRefreshToken(user.id);

    return success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (err) {
    if (err.message?.includes('revoked') || err.name === 'JsonWebTokenError') {
      return error(res, 'Invalid or expired refresh token', 401);
    }
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout-all
 */
const logoutAll = async (req, res, next) => {
  try {
    await revokeAllUserTokens(req.user.id);
    return success(res, null, 'Logged out from all devices');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    return success(res, { user: req.user }, 'Profile retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByEmail(req.user.email);
    const valid = await User.verifyPassword(currentPassword, user.password);
    if (!valid) {
      return error(res, 'Current password is incorrect', 400);
    }

    await User.changePassword(req.user.id, newPassword);
    await revokeAllUserTokens(req.user.id); // Force re-login

    return success(res, null, 'Password changed. Please log in again.');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, logoutAll, getMe, changePassword };

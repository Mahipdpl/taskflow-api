// src/controllers/userController.js
const User = require('../models/User');
const { success, error, paginated } = require('../utils/response');

/**
 * GET /api/v1/users  (admin only)
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const { users, total } = await User.findAll({
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      role,
    });
    return paginated(res, users, total, page, Math.min(parseInt(limit), 100));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/users/:id  (admin or self)
 */
const getUser = async (req, res, next) => {
  try {
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Forbidden', 403);
    }
    const user = await User.findById(req.params.id);
    if (!user) return error(res, 'User not found', 404);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/users/:id  (admin only)
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, is_active } = req.body;
    const user = await User.update(req.params.id, { name, email, role, is_active });
    if (!user) return error(res, 'User not found', 404);
    return success(res, { user }, 'User updated');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/users/:id  (admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return error(res, 'Cannot delete your own account', 400);
    }
    const deleted = await User.delete(req.params.id);
    if (!deleted) return error(res, 'User not found', 404);
    return success(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUser, updateUser, deleteUser };

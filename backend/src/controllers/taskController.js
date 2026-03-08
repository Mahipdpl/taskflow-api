// src/controllers/taskController.js
const Task = require('../models/Task');
const { success, error, paginated } = require('../utils/response');

/**
 * GET /api/v1/tasks
 */
const getTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;
    const { tasks, total } = await Task.findAll({
      user_id: req.user.id,
      role: req.user.role,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100), // cap at 100
      status,
      priority,
    });
    return paginated(res, tasks, total, page, Math.min(parseInt(limit), 100));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tasks/:id
 */
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return error(res, 'Task not found', 404);

    // Only owner or admin can view
    if (task.user_id !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Forbidden', 403);
    }

    return success(res, { task });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/tasks
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, due_date } = req.body;
    const task = await Task.create({
      title,
      description,
      status,
      priority,
      due_date,
      user_id: req.user.id,
    });
    return success(res, { task }, 'Task created', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/tasks/:id
 */
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return error(res, 'Task not found', 404);

    if (task.user_id !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Forbidden', 403);
    }

    const { title, description, status, priority, due_date } = req.body;
    const updated = await Task.update(req.params.id, { title, description, status, priority, due_date });
    return success(res, { task: updated }, 'Task updated');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/tasks/:id
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return error(res, 'Task not found', 404);

    if (task.user_id !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Forbidden', 403);
    }

    await Task.delete(req.params.id);
    return success(res, null, 'Task deleted');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tasks/stats  (admin only)
 */
const getStats = async (req, res, next) => {
  try {
    const stats = await Task.getStats();
    return success(res, { stats });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, getStats };

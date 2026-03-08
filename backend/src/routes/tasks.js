// src/routes/tasks.js
const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/taskController');

const router = express.Router();

// All task routes require authentication
router.use(authenticate);

const STATUSES  = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

const uuidParam = param('id').isUUID().withMessage('Invalid task ID');

/**
 * @swagger
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List tasks (own tasks or all if admin)
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(STATUSES),
    query('priority').optional().isIn(PRIORITIES),
  ],
  validate,
  ctrl.getTasks
);

/**
 * @swagger
 * /tasks/stats:
 *   get:
 *     tags: [Tasks]
 *     summary: Task statistics (admin only)
 */
router.get('/stats', authorize('admin'), ctrl.getStats);

router.get('/:id', [uuidParam], validate, ctrl.getTask);

/**
 * @swagger
 * /tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 */
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('status').optional().isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
    body('priority').optional().isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
    body('due_date').optional().isISO8601().withMessage('due_date must be a valid ISO 8601 date'),
  ],
  validate,
  ctrl.createTask
);

router.put(
  '/:id',
  [
    uuidParam,
    body('title').optional().trim().notEmpty().isLength({ max: 255 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('status').optional().isIn(STATUSES),
    body('priority').optional().isIn(PRIORITIES),
    body('due_date').optional().isISO8601(),
  ],
  validate,
  ctrl.updateTask
);

router.delete('/:id', [uuidParam], validate, ctrl.deleteTask);

module.exports = router;

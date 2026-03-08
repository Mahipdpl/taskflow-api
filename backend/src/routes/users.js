// src/routes/users.js
const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);

const uuidParam = param('id').isUUID().withMessage('Invalid user ID');

// GET /users — admin only
router.get('/', authorize('admin'), ctrl.getUsers);

// GET /users/:id — admin or self (enforced in controller)
router.get('/:id', [uuidParam], validate, ctrl.getUser);

// PUT /users/:id — admin only
router.put(
  '/:id',
  authorize('admin'),
  [
    uuidParam,
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('email').optional().trim().isEmail().normalizeEmail(),
    body('role').optional().isIn(['user', 'admin']),
    body('is_active').optional().isBoolean(),
  ],
  validate,
  ctrl.updateUser
);

// DELETE /users/:id — admin only
router.delete('/:id', authorize('admin'), [uuidParam], validate, ctrl.deleteUser);

module.exports = router;

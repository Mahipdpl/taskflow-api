// src/middleware/validate.js
const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

/**
 * Run express-validator results and return 422 if invalid
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
      value: e.value,
    }));
    return error(res, 'Validation failed', 422, formatted);
  }
  next();
};

module.exports = { validate };

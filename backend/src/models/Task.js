// src/models/Task.js
const { query } = require('../config/database');

const Task = {
  /**
   * Create a task
   */
  async create({ title, description, status = 'todo', priority = 'medium', due_date, user_id }) {
    const { rows } = await query(
      `INSERT INTO tasks (title, description, status, priority, due_date, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, status, priority, due_date || null, user_id]
    );
    return rows[0];
  },

  /**
   * Find task by ID
   */
  async findById(id) {
    const { rows } = await query(
      `SELECT t.*, u.name as owner_name, u.email as owner_email
       FROM tasks t JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * List tasks with filters and pagination
   * - Users see only their own tasks
   * - Admins see all tasks
   */
  async findAll({ user_id, role, page = 1, limit = 20, status, priority } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (role !== 'admin') {
      params.push(user_id);
      conditions.push(`t.user_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }

    if (priority) {
      params.push(priority);
      conditions.push(`t.priority = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseSql = `
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      ${where}
    `;

    const countRes = await query(`SELECT COUNT(*) ${baseSql}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT t.*, u.name as owner_name ${baseSql}
       ORDER BY t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { tasks: rows, total };
  },

  /**
   * Update a task
   */
  async update(id, fields) {
    const allowed = ['title', 'description', 'status', 'priority', 'due_date'];
    const updates = [];
    const values = [];

    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key) && val !== undefined) {
        values.push(val);
        updates.push(`${key} = $${values.length}`);
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    const { rows } = await query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  /**
   * Delete a task
   */
  async delete(id) {
    const { rowCount } = await query('DELETE FROM tasks WHERE id = $1', [id]);
    return rowCount > 0;
  },

  /**
   * Stats for admin dashboard
   */
  async getStats() {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'todo')        AS todo,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'done')        AS done,
        COUNT(*)                                        AS total
      FROM tasks
    `);
    return rows[0];
  },
};

module.exports = Task;

// src/models/User.js
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const SALT_ROUNDS = 12;

const User = {
  /**
   * Create a new user with hashed password
   */
  async create({ name, email, password, role = 'user' }) {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email.toLowerCase().trim(), hashed, role]
    );
    return rows[0];
  },

  /**
   * Find user by email (includes password for auth)
   */
  async findByEmail(email) {
    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  },

  /**
   * Find user by ID (excludes password)
   */
  async findById(id) {
    const { rows } = await query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * List all users (admin only)
   */
  async findAll({ page = 1, limit = 20, role } = {}) {
    const offset = (page - 1) * limit;
    let sql = 'SELECT id, name, email, role, is_active, created_at FROM users';
    const params = [];

    if (role) {
      params.push(role);
      sql += ` WHERE role = $${params.length}`;
    }

    const countSql = sql.replace(
      'SELECT id, name, email, role, is_active, created_at',
      'SELECT COUNT(*)'
    );

    params.push(limit, offset);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      query(sql, params),
      query(countSql, role ? [role] : []),
    ]);

    return { users: rows, total: parseInt(countRows[0].count) };
  },

  /**
   * Update user fields
   */
  async update(id, fields) {
    const allowed = ['name', 'email', 'is_active', 'role'];
    const updates = [];
    const values = [];

    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        values.push(val);
        updates.push(`${key} = $${values.length}`);
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING id, name, email, role, is_active, updated_at`,
      values
    );
    return rows[0] || null;
  },

  /**
   * Change password
   */
  async changePassword(id, newPassword) {
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, id]);
  },

  /**
   * Delete user
   */
  async delete(id) {
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount > 0;
  },

  /**
   * Verify a plain password against the stored hash
   */
  async verifyPassword(plain, hashed) {
    return bcrypt.compare(plain, hashed);
  },
};

module.exports = User;

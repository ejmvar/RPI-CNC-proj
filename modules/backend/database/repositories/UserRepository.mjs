/**
 * User Repository - Data access layer for users
 */

import { query } from '../connection.mjs';
// import { transaction } from '../connection.mjs'; // Reserved for future transactional operations
import { hashPassword } from '../../security/auth.mjs';

export class UserRepository {
  /**
   * Find user by ID
   */
  async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1 AND is_active = TRUE', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    const result = await query('SELECT * FROM users WHERE username = $1 AND is_active = TRUE', [
      username,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [
      email,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Create new user
   */
  async create(userData) {
    const { username, email, password, displayName, role = 'user' } = userData;

    // Hash password
    const passwordHash = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [username, email, passwordHash, displayName, role]
    );

    return result.rows[0];
  }

  /**
   * Update user
   */
  async update(id, updates) {
    const allowedFields = ['email', 'display_name', 'is_verified'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        fields.push(`${snakeKey} = $${paramCount++}`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Update password
   */
  async updatePassword(id, newPassword) {
    const passwordHash = await hashPassword(newPassword);
    const result = await query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *', [
      passwordHash,
      id,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Update last login time
   */
  async updateLastLogin(id) {
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivate(id) {
    const result = await query('UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING *', [
      id,
    ]);
    return result.rows[0] || null;
  }

  /**
   * List users with pagination
   */
  async list(options = {}) {
    const { limit = 50, offset = 0, role, isVerified } = options;

    let whereClause = 'WHERE is_active = TRUE';
    const params = [];
    let paramCount = 1;

    if (role) {
      whereClause += ` AND role = $${paramCount++}`;
      params.push(role);
    }

    if (typeof isVerified === 'boolean') {
      whereClause += ` AND is_verified = $${paramCount++}`;
      params.push(isVerified);
    }

    params.push(limit, offset);

    const result = await query(
      `SELECT id, username, email, display_name, role, created_at, last_login_at, is_verified
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount}`,
      params
    );

    return result.rows;
  }

  /**
   * Count users
   */
  async count(options = {}) {
    const { role, isVerified } = options;

    let whereClause = 'WHERE is_active = TRUE';
    const params = [];
    let paramCount = 1;

    if (role) {
      whereClause += ` AND role = $${paramCount++}`;
      params.push(role);
    }

    if (typeof isVerified === 'boolean') {
      whereClause += ` AND is_verified = $${paramCount++}`;
      params.push(isVerified);
    }

    const result = await query(`SELECT COUNT(*) as count FROM users ${whereClause}`, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Search users by username or email
   */
  async search(searchTerm, limit = 20) {
    const result = await query(
      `SELECT id, username, email, display_name, role
       FROM users
       WHERE is_active = TRUE
       AND (username ILIKE $1 OR email ILIKE $1)
       ORDER BY username
       LIMIT $2`,
      [`%${searchTerm}%`, limit]
    );

    return result.rows;
  }
}

export default new UserRepository();

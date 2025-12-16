/**
 * G-Code File Repository - Data access layer for G-Code files
 */

import { query, transaction } from '../connection.mjs';
import crypto from 'crypto';

export class GCodeFileRepository {
  /**
   * Calculate file checksum
   */
  _calculateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Find file by ID
   */
  async findById(id) {
    const result = await query('SELECT * FROM gcode_files WHERE id = $1 AND deleted_at IS NULL', [
      id,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Create new G-Code file
   */
  async create(fileData) {
    const { userId, filename, description, content, folderId, tags = [], metadata = {} } = fileData;

    const sizeBytes = Buffer.byteLength(content, 'utf8');
    const checksum = this._calculateChecksum(content);

    const result = await query(
      `INSERT INTO gcode_files (user_id, filename, description, content, size_bytes, checksum, folder_id, tags, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, filename, description, content, sizeBytes, checksum, folderId, tags, metadata]
    );

    return result.rows[0];
  }

  /**
   * Update file
   */
  async update(id, userId, updates) {
    const allowedFields = ['filename', 'description', 'folder_id', 'tags', 'metadata', 'is_public'];
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

    values.push(id, userId);
    const result = await query(
      `UPDATE gcode_files
       SET ${fields.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Update file content (creates new version)
   */
  async updateContent(id, userId, newContent) {
    return transaction(async (client) => {
      // Get current file
      const currentResult = await client.query(
        'SELECT * FROM gcode_files WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('File not found');
      }

      // const currentFile = currentResult.rows[0]; // Reserved for future version comparison
      const sizeBytes = Buffer.byteLength(newContent, 'utf8');
      const checksum = this._calculateChecksum(newContent);

      // Update file
      const updateResult = await client.query(
        `UPDATE gcode_files
         SET content = $1, size_bytes = $2, checksum = $3, version = version + 1
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [newContent, sizeBytes, checksum, id, userId]
      );

      return updateResult.rows[0];
    });
  }

  /**
   * Delete file (soft delete)
   */
  async delete(id, userId) {
    const result = await query(
      `UPDATE gcode_files
       SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * List user's files
   */
  async listByUser(userId, options = {}) {
    const { limit = 50, offset = 0, folderId, tags, isPublic } = options;

    let whereClause = 'WHERE user_id = $1 AND deleted_at IS NULL';
    const params = [userId];
    let paramCount = 2;

    if (folderId) {
      whereClause += ` AND folder_id = $${paramCount++}`;
      params.push(folderId);
    } else if (folderId === null) {
      whereClause += ' AND folder_id IS NULL';
    }

    if (tags && tags.length > 0) {
      whereClause += ` AND tags && $${paramCount++}`;
      params.push(tags);
    }

    if (typeof isPublic === 'boolean') {
      whereClause += ` AND is_public = $${paramCount++}`;
      params.push(isPublic);
    }

    params.push(limit, offset);

    const result = await query(
      `SELECT id, filename, description, size_bytes, folder_id, version, is_public, tags, created_at, updated_at
       FROM gcode_files
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount}`,
      params
    );

    return result.rows;
  }

  /**
   * Search files
   */
  async search(userId, searchTerm, options = {}) {
    const { limit = 20, includePublic = false } = options;

    let whereClause = 'WHERE deleted_at IS NULL';
    const params = [];
    let paramCount = 1;

    if (includePublic) {
      whereClause += ` AND (user_id = $${paramCount++} OR is_public = TRUE)`;
      params.push(userId);
    } else {
      whereClause += ` AND user_id = $${paramCount++}`;
      params.push(userId);
    }

    whereClause += ` AND (filename ILIKE $${paramCount++} OR description ILIKE $${paramCount})`;
    params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    paramCount++;

    params.push(limit);

    const result = await query(
      `SELECT id, filename, description, size_bytes, is_public, tags, created_at, updated_at
       FROM gcode_files
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $${paramCount}`,
      params
    );

    return result.rows;
  }

  /**
   * Get file versions
   */
  async getVersions(parentFileId, userId) {
    const result = await query(
      `SELECT id, filename, version, size_bytes, created_at
       FROM gcode_files
       WHERE (id = $1 OR parent_file_id = $1) AND user_id = $2 AND deleted_at IS NULL
       ORDER BY version DESC`,
      [parentFileId, userId]
    );

    return result.rows;
  }

  /**
   * Count user's files
   */
  async countByUser(userId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM gcode_files WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get file statistics for user
   */
  async getUserStats(userId) {
    const result = await query(
      `SELECT 
        COUNT(*) as file_count,
        COALESCE(SUM(size_bytes), 0) as total_size_bytes,
        MAX(created_at) as last_upload_at
       FROM gcode_files
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    return result.rows[0];
  }
}

export default new GCodeFileRepository();

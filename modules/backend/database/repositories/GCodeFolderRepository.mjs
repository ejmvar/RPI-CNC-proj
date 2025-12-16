/**
 * G-Code Folder Repository - Data access layer for folders
 */

import { query, transaction } from '../connection.mjs';

export class GCodeFolderRepository {
  /**
   * Find folder by ID
   */
  async findById(id) {
    const result = await query('SELECT * FROM gcode_folders WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * List user's folders
   */
  async listByUser(userId, parentFolderId = null) {
    let whereClause = 'WHERE user_id = $1';
    const params = [userId];

    if (parentFolderId) {
      whereClause += ' AND parent_folder_id = $2';
      params.push(parentFolderId);
    } else {
      whereClause += ' AND parent_folder_id IS NULL';
    }

    const result = await query(`SELECT * FROM gcode_folders ${whereClause} ORDER BY name`, params);

    return result.rows;
  }

  /**
   * Create folder
   */
  async create(folderData) {
    const { userId, name, parentFolderId = null } = folderData;

    // Calculate path
    let path = name;
    if (parentFolderId) {
      const parent = await this.findById(parentFolderId);
      if (parent) {
        path = `${parent.path}/${name}`;
      }
    }

    const result = await query(
      `INSERT INTO gcode_folders (user_id, name, parent_folder_id, path)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, parentFolderId, path]
    );

    return result.rows[0];
  }

  /**
   * Update folder
   */
  async update(id, userId, updates) {
    const allowedFields = ['name'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount++}`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id, userId);
    const result = await query(
      `UPDATE gcode_folders
       SET ${fields.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Delete folder
   */
  async delete(id, userId) {
    const result = await query(
      'DELETE FROM gcode_folders WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get folder tree
   */
  async getTree(userId) {
    const result = await query('SELECT * FROM gcode_folders WHERE user_id = $1 ORDER BY path', [
      userId,
    ]);

    return this._buildTree(result.rows);
  }

  /**
   * Build folder tree structure
   */
  _buildTree(folders) {
    const map = {};
    const roots = [];

    // Create map
    folders.forEach((folder) => {
      map[folder.id] = { ...folder, children: [] };
    });

    // Build tree
    folders.forEach((folder) => {
      if (folder.parent_folder_id) {
        const parent = map[folder.parent_folder_id];
        if (parent) {
          parent.children.push(map[folder.id]);
        }
      } else {
        roots.push(map[folder.id]);
      }
    });

    return roots;
  }
}

export default new GCodeFolderRepository();

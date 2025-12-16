/**
 * G-Code Folder API Routes
 */

import express from 'express';
import { authenticate } from '../security/auth.mjs';
import gcodeFolderRepository from '../database/repositories/GCodeFolderRepository.mjs';
import logger from '../logging/logger.mjs';
import { operationsTotal } from '../monitoring/metrics.mjs';

const router = express.Router();

/**
 * GET /api/folders
 * List user's folders
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { parentId } = req.query;
    const folders = await gcodeFolderRepository.listByUser(req.user.userId, parentId || null);

    res.json({ folders });
  } catch (error) {
    logger.error('List folders error', { error: error.message });
    res.status(500).json({ error: 'Failed to list folders' });
  }
});

/**
 * GET /api/folders/tree
 * Get folder tree
 */
router.get('/tree', authenticate, async (req, res) => {
  try {
    const tree = await gcodeFolderRepository.getTree(req.user.userId);
    res.json({ tree });
  } catch (error) {
    logger.error('Get folder tree error', { error: error.message });
    res.status(500).json({ error: 'Failed to get folder tree' });
  }
});

/**
 * GET /api/folders/:id
 * Get folder by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const folder = await gcodeFolderRepository.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (folder.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(folder);
  } catch (error) {
    logger.error('Get folder error', { error: error.message });
    res.status(500).json({ error: 'Failed to get folder' });
  }
});

/**
 * POST /api/folders
 * Create new folder
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, parentFolderId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = await gcodeFolderRepository.create({
      userId: req.user.userId,
      name,
      parentFolderId: parentFolderId || null,
    });

    operationsTotal.labels('folder_create').inc();
    logger.info('Folder created', { userId: req.user.userId, folderId: folder.id });

    res.status(201).json(folder);
  } catch (error) {
    logger.error('Create folder error', { error: error.message });
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

/**
 * PUT /api/folders/:id
 * Update folder
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = await gcodeFolderRepository.update(req.params.id, req.user.userId, {
      name,
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    operationsTotal.labels('folder_update').inc();
    logger.info('Folder updated', { userId: req.user.userId, folderId: folder.id });

    res.json(folder);
  } catch (error) {
    logger.error('Update folder error', { error: error.message });
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

/**
 * DELETE /api/folders/:id
 * Delete folder
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const folder = await gcodeFolderRepository.delete(req.params.id, req.user.userId);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    operationsTotal.labels('folder_delete').inc();
    logger.info('Folder deleted', { userId: req.user.userId, folderId: folder.id });

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    logger.error('Delete folder error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

export default router;

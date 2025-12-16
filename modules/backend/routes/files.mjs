/**
 * G-Code File API Routes
 */

import express from 'express';
import { authenticate } from '../security/auth.mjs';
import gcodeFileRepository from '../database/repositories/GCodeFileRepository.mjs';
import logger from '../logging/logger.mjs';
import { operationsTotal } from '../monitoring/metrics.mjs';

const router = express.Router();

/**
 * GET /api/files
 * List user's G-Code files
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0, folderId, tags, isPublic } = req.query;

    const options = {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      folderId: folderId === 'null' ? null : folderId,
      tags: tags ? tags.split(',') : undefined,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
    };

    const files = await gcodeFileRepository.listByUser(req.user.userId, options);
    const total = await gcodeFileRepository.countByUser(req.user.userId);

    res.json({
      files,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total,
      },
    });
  } catch (error) {
    logger.error('List files error', { error: error.message });
    res.status(500).json({ error: 'Failed to list files' });
  }
});

/**
 * GET /api/files/search
 * Search user's files
 */
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, includePublic = false } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const files = await gcodeFileRepository.search(req.user.userId, q, {
      includePublic: includePublic === 'true',
    });

    res.json({ files });
  } catch (error) {
    logger.error('Search files error', { error: error.message });
    res.status(500).json({ error: 'Failed to search files' });
  }
});

/**
 * GET /api/files/stats
 * Get user's file statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await gcodeFileRepository.getUserStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    logger.error('Get stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * GET /api/files/:id
 * Get file by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const file = await gcodeFileRepository.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permissions
    if (file.user_id !== req.user.userId && !file.is_public) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(file);
  } catch (error) {
    logger.error('Get file error', { error: error.message });
    res.status(500).json({ error: 'Failed to get file' });
  }
});

/**
 * POST /api/files
 * Create new G-Code file
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { filename, description, content, folderId, tags, metadata } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }

    const file = await gcodeFileRepository.create({
      userId: req.user.userId,
      filename,
      description,
      content,
      folderId: folderId || null,
      tags: tags || [],
      metadata: metadata || {},
    });

    operationsTotal.labels('file_create').inc();
    logger.info('File created', { userId: req.user.userId, fileId: file.id });

    res.status(201).json(file);
  } catch (error) {
    logger.error('Create file error', { error: error.message });
    res.status(500).json({ error: 'Failed to create file' });
  }
});

/**
 * PUT /api/files/:id
 * Update file metadata
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { filename, description, folderId, tags, metadata, isPublic } = req.body;

    const updates = {};
    if (filename !== undefined) updates.filename = filename;
    if (description !== undefined) updates.description = description;
    if (folderId !== undefined) updates.folderId = folderId;
    if (tags !== undefined) updates.tags = tags;
    if (metadata !== undefined) updates.metadata = metadata;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    const file = await gcodeFileRepository.update(req.params.id, req.user.userId, updates);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    operationsTotal.labels('file_update').inc();
    logger.info('File updated', { userId: req.user.userId, fileId: file.id });

    res.json(file);
  } catch (error) {
    logger.error('Update file error', { error: error.message });
    res.status(500).json({ error: 'Failed to update file' });
  }
});

/**
 * PUT /api/files/:id/content
 * Update file content (creates new version)
 */
router.put('/:id/content', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const file = await gcodeFileRepository.updateContent(req.params.id, req.user.userId, content);

    operationsTotal.labels('file_version').inc();
    logger.info('File content updated', {
      userId: req.user.userId,
      fileId: file.id,
      version: file.version,
    });

    res.json(file);
  } catch (error) {
    logger.error('Update content error', { error: error.message });
    res.status(500).json({ error: 'Failed to update content' });
  }
});

/**
 * GET /api/files/:id/versions
 * Get file version history
 */
router.get('/:id/versions', authenticate, async (req, res) => {
  try {
    const versions = await gcodeFileRepository.getVersions(req.params.id, req.user.userId);

    if (versions.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ versions });
  } catch (error) {
    logger.error('Get versions error', { error: error.message });
    res.status(500).json({ error: 'Failed to get versions' });
  }
});

/**
 * DELETE /api/files/:id
 * Delete file (soft delete)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const file = await gcodeFileRepository.delete(req.params.id, req.user.userId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    operationsTotal.labels('file_delete').inc();
    logger.info('File deleted', { userId: req.user.userId, fileId: file.id });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error('Delete file error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * POST /api/files/:id/duplicate
 * Duplicate a file
 */
router.post('/:id/duplicate', authenticate, async (req, res) => {
  try {
    const original = await gcodeFileRepository.findById(req.params.id);

    if (!original) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permissions
    if (original.user_id !== req.user.userId && !original.is_public) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const duplicate = await gcodeFileRepository.create({
      userId: req.user.userId,
      filename: `${original.filename} (copy)`,
      description: original.description,
      content: original.content,
      folderId: original.folder_id,
      tags: original.tags,
      metadata: original.metadata,
    });

    operationsTotal.labels('file_duplicate').inc();
    logger.info('File duplicated', { userId: req.user.userId, fileId: duplicate.id });

    res.status(201).json(duplicate);
  } catch (error) {
    logger.error('Duplicate file error', { error: error.message });
    res.status(500).json({ error: 'Failed to duplicate file' });
  }
});

export default router;

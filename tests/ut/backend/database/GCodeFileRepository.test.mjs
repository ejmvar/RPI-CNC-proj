/**
 * Unit tests for GCodeFileRepository
 */

import { jest } from '@jest/globals';
import crypto from 'crypto';

// Mock the connection module
const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.unstable_mockModule('../../../../modules/backend/database/connection.mjs', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

// Import repository
const { GCodeFileRepository } = await import(
  '../../../../modules/backend/database/repositories/GCodeFileRepository.mjs'
);

describe('GCodeFileRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new GCodeFileRepository();
    jest.clearAllMocks();
  });

  describe('_calculateChecksum', () => {
    test('calculates SHA256 checksum correctly', () => {
      const content = 'G1 X10 Y10';
      const expected = crypto.createHash('sha256').update(content).digest('hex');

      const result = repository._calculateChecksum(content);

      expect(result).toBe(expected);
    });
  });

  describe('findById', () => {
    test('returns file when found', async () => {
      const mockFile = { id: 1, filename: 'test.gcode', content: 'G1 X10' };
      mockQuery.mockResolvedValue({ rows: [mockFile] });

      const result = await repository.findById(1);

      expect(result).toEqual(mockFile);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM gcode_files WHERE id = $1 AND deleted_at IS NULL',
        [1]
      );
    });

    test('returns null when file not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    test('creates file with all fields', async () => {
      const fileData = {
        userId: 1,
        filename: 'test.gcode',
        description: 'Test file',
        content: 'G1 X10 Y10',
        folderId: 5,
        tags: ['test', 'demo'],
        metadata: { machine: 'CNC1' },
      };

      const mockCreatedFile = { id: 1, ...fileData };
      mockQuery.mockResolvedValue({ rows: [mockCreatedFile] });

      const result = await repository.create(fileData);

      expect(result).toEqual(mockCreatedFile);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO gcode_files'),
        expect.arrayContaining([
          1,
          'test.gcode',
          'Test file',
          'G1 X10 Y10',
          expect.any(Number), // size_bytes
          expect.any(String), // checksum
          5,
          ['test', 'demo'],
          { machine: 'CNC1' },
        ])
      );
    });

    test('calculates size and checksum automatically', async () => {
      const content = 'G1 X10 Y10 Z5';
      const expectedSize = Buffer.byteLength(content, 'utf8');
      const expectedChecksum = crypto.createHash('sha256').update(content).digest('hex');

      mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

      await repository.create({
        userId: 1,
        filename: 'test.gcode',
        content,
      });

      const callArgs = mockQuery.mock.calls[0][1];
      expect(callArgs[4]).toBe(expectedSize);
      expect(callArgs[5]).toBe(expectedChecksum);
    });
  });

  describe('update', () => {
    test('updates allowed fields', async () => {
      const updates = {
        filename: 'updated.gcode',
        description: 'Updated description',
        tags: ['updated'],
      };

      const mockUpdatedFile = { id: 1, userId: 1, ...updates };
      mockQuery.mockResolvedValue({ rows: [mockUpdatedFile] });

      const result = await repository.update(1, 1, updates);

      expect(result).toEqual(mockUpdatedFile);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE gcode_files'),
        expect.arrayContaining(['updated.gcode', 'Updated description', ['updated'], 1, 1])
      );
    });

    test('throws error when no valid fields to update', async () => {
      await expect(repository.update(1, 1, { invalid: 'field' })).rejects.toThrow(
        'No valid fields to update'
      );
    });

    test('returns null when file not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.update(999, 1, { filename: 'new.gcode' });

      expect(result).toBeNull();
    });
  });

  describe('updateContent', () => {
    test('updates content and increments version', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ id: 1, content: 'old content', version: 1 }] })
          .mockResolvedValueOnce({ rows: [{ id: 1, content: 'new content', version: 2 }] }),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      const newContent = 'G1 X20 Y20';
      const result = await repository.updateContent(1, 1, newContent);

      expect(result.version).toBe(2);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('version = version + 1'),
        expect.arrayContaining([newContent, expect.any(Number), expect.any(String), 1, 1])
      );
    });

    test('throws error when file not found', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      await expect(repository.updateContent(999, 1, 'new content')).rejects.toThrow(
        'File not found'
      );
    });
  });

  describe('delete', () => {
    test('soft deletes file', async () => {
      const mockFile = { id: 1, filename: 'test.gcode', deleted_at: new Date() };
      mockQuery.mockResolvedValue({ rows: [mockFile] });

      const result = await repository.delete(1, 1);

      expect(result).toEqual(mockFile);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('deleted_at = NOW()'), [1, 1]);
    });

    test('returns null when file not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.delete(999, 1);

      expect(result).toBeNull();
    });
  });

  describe('listByUser', () => {
    test('lists user files with default pagination', async () => {
      const mockFiles = [
        { id: 1, filename: 'file1.gcode' },
        { id: 2, filename: 'file2.gcode' },
      ];
      mockQuery.mockResolvedValue({ rows: mockFiles });

      const result = await repository.listByUser(1);

      expect(result).toEqual(mockFiles);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('user_id = $1'), [1, 50, 0]);
    });

    test('filters by folder', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.listByUser(1, { folderId: 5 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('folder_id = $2'),
        [1, 5, 50, 0]
      );
    });

    test('filters by null folder (root)', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.listByUser(1, { folderId: null });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('folder_id IS NULL'),
        [1, 50, 0]
      );
    });

    test('filters by tags', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.listByUser(1, { tags: ['test', 'demo'] });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tags &&'), [
        1,
        ['test', 'demo'],
        50,
        0,
      ]);
    });

    test('filters by public status', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.listByUser(1, { isPublic: true });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('is_public = $2'), [
        1,
        true,
        50,
        0,
      ]);
    });
  });

  describe('search', () => {
    test('searches files by term', async () => {
      const mockFiles = [{ id: 1, filename: 'test.gcode' }];
      mockQuery.mockResolvedValue({ rows: mockFiles });

      const result = await repository.search(1, 'test');

      expect(result).toEqual(mockFiles);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('filename ILIKE'), [
        1,
        '%test%',
        '%test%',
        20,
      ]);
    });

    test('includes public files when specified', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.search(1, 'test', { includePublic: true });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('OR is_public = TRUE'), [
        1,
        '%test%',
        '%test%',
        20,
      ]);
    });

    test('uses custom limit', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.search(1, 'test', { limit: 10 });

      expect(mockQuery).toHaveBeenCalledWith(expect.anything(), [1, '%test%', '%test%', 10]);
    });
  });

  describe('getVersions', () => {
    test('retrieves file versions', async () => {
      const mockVersions = [
        { id: 1, version: 2 },
        { id: 1, version: 1 },
      ];
      mockQuery.mockResolvedValue({ rows: mockVersions });

      const result = await repository.getVersions(1, 1);

      expect(result).toEqual(mockVersions);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('OR parent_file_id = $1'),
        [1, 1]
      );
    });
  });

  describe('countByUser', () => {
    test('counts user files', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '42' }] });

      const result = await repository.countByUser(1);

      expect(result).toBe(42);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'), [1]);
    });
  });

  describe('getUserStats', () => {
    test('returns user statistics', async () => {
      const mockStats = {
        file_count: '10',
        total_size_bytes: '5000',
        last_upload_at: new Date(),
      };
      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await repository.getUserStats(1);

      expect(result).toEqual(mockStats);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SUM(size_bytes)'), [1]);
    });
  });
});

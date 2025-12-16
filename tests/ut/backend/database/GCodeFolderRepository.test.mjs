/**
 * Unit tests for GCodeFolderRepository
 */

import { jest } from '@jest/globals';

// Mock the connection module
const mockQuery = jest.fn();

jest.unstable_mockModule('../../../../modules/backend/database/connection.mjs', () => ({
  query: mockQuery,
}));

// Import repository
const { GCodeFolderRepository } = await import(
  '../../../../modules/backend/database/repositories/GCodeFolderRepository.mjs'
);

describe('GCodeFolderRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new GCodeFolderRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    test('returns folder when found', async () => {
      const mockFolder = { id: 1, name: 'Projects', user_id: 1 };
      mockQuery.mockResolvedValue({ rows: [mockFolder] });

      const result = await repository.findById(1);

      expect(result).toEqual(mockFolder);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM gcode_folders WHERE id = $1', [1]);
    });

    test('returns null when folder not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('listByUser', () => {
    test('lists root folders when no parent specified', async () => {
      const mockFolders = [
        { id: 1, name: 'Projects', parent_folder_id: null },
        { id: 2, name: 'Templates', parent_folder_id: null },
      ];
      mockQuery.mockResolvedValue({ rows: mockFolders });

      const result = await repository.listByUser(1);

      expect(result).toEqual(mockFolders);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('parent_folder_id IS NULL'), [
        1,
      ]);
    });

    test('lists subfolders when parent specified', async () => {
      const mockFolders = [{ id: 3, name: 'Subfolder', parent_folder_id: 1 }];
      mockQuery.mockResolvedValue({ rows: mockFolders });

      const result = await repository.listByUser(1, 1);

      expect(result).toEqual(mockFolders);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('parent_folder_id = $2'),
        [1, 1]
      );
    });
  });

  describe('create', () => {
    test('creates root folder', async () => {
      const folderData = {
        userId: 1,
        name: 'NewProject',
      };

      const mockCreatedFolder = {
        id: 1,
        user_id: 1,
        name: 'NewProject',
        parent_folder_id: null,
        path: 'NewProject',
      };
      mockQuery.mockResolvedValue({ rows: [mockCreatedFolder] });

      const result = await repository.create(folderData);

      expect(result).toEqual(mockCreatedFolder);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO gcode_folders'), [
        1,
        'NewProject',
        null,
        'NewProject',
      ]);
    });

    test('creates subfolder with path', async () => {
      const parentFolder = {
        id: 1,
        name: 'Projects',
        path: 'Projects',
      };

      // First call returns parent folder, second call creates new folder
      mockQuery.mockResolvedValueOnce({ rows: [parentFolder] }).mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            user_id: 1,
            name: 'Subfolder',
            parent_folder_id: 1,
            path: 'Projects/Subfolder',
          },
        ],
      });

      const result = await repository.create({
        userId: 1,
        name: 'Subfolder',
        parentFolderId: 1,
      });

      expect(result.path).toBe('Projects/Subfolder');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    test('creates folder with null parent when parent not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // parent not found
        .mockResolvedValueOnce({ rows: [{ id: 1, path: 'Orphan' }] });

      const result = await repository.create({
        userId: 1,
        name: 'Orphan',
        parentFolderId: 999,
      });

      expect(result.path).toBe('Orphan');
    });
  });

  describe('update', () => {
    test('updates folder name', async () => {
      const updates = { name: 'RenamedFolder' };
      const mockUpdatedFolder = { id: 1, name: 'RenamedFolder', user_id: 1 };
      mockQuery.mockResolvedValue({ rows: [mockUpdatedFolder] });

      const result = await repository.update(1, 1, updates);

      expect(result).toEqual(mockUpdatedFolder);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE gcode_folders'), [
        'RenamedFolder',
        1,
        1,
      ]);
    });

    test('throws error when no valid fields to update', async () => {
      await expect(repository.update(1, 1, { invalid: 'field' })).rejects.toThrow(
        'No valid fields to update'
      );
    });

    test('returns null when folder not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.update(999, 1, { name: 'New Name' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    test('deletes folder', async () => {
      const mockFolder = { id: 1, name: 'DeletedFolder' };
      mockQuery.mockResolvedValue({ rows: [mockFolder] });

      const result = await repository.delete(1, 1);

      expect(result).toEqual(mockFolder);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM gcode_folders WHERE id = $1 AND user_id = $2 RETURNING *',
        [1, 1]
      );
    });

    test('returns null when folder not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.delete(999, 1);

      expect(result).toBeNull();
    });
  });

  describe('getTree', () => {
    test('builds folder tree structure', async () => {
      const mockFolders = [
        { id: 1, name: 'Root1', parent_folder_id: null, path: 'Root1' },
        { id: 2, name: 'Root2', parent_folder_id: null, path: 'Root2' },
        { id: 3, name: 'Child1', parent_folder_id: 1, path: 'Root1/Child1' },
        { id: 4, name: 'Child2', parent_folder_id: 1, path: 'Root1/Child2' },
        { id: 5, name: 'GrandChild', parent_folder_id: 3, path: 'Root1/Child1/GrandChild' },
      ];
      mockQuery.mockResolvedValue({ rows: mockFolders });

      const result = await repository.getTree(1);

      // Should have 2 root folders
      expect(result).toHaveLength(2);

      // First root should have 2 children
      expect(result[0].children).toHaveLength(2);

      // First child of first root should have 1 grandchild
      expect(result[0].children[0].children).toHaveLength(1);

      // Second root should have no children
      expect(result[1].children).toHaveLength(0);
    });

    test('returns empty array when no folders', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getTree(1);

      expect(result).toEqual([]);
    });
  });

  describe('_buildTree', () => {
    test('builds correct tree structure from flat list', () => {
      const flatFolders = [
        { id: 1, name: 'Root', parent_folder_id: null },
        { id: 2, name: 'Child1', parent_folder_id: 1 },
        { id: 3, name: 'Child2', parent_folder_id: 1 },
        { id: 4, name: 'GrandChild', parent_folder_id: 2 },
      ];

      const tree = repository._buildTree(flatFolders);

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe(1);
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children[0].children).toHaveLength(1);
    });

    test('handles orphaned folders gracefully', () => {
      const flatFolders = [
        { id: 1, name: 'Root', parent_folder_id: null },
        { id: 2, name: 'Orphan', parent_folder_id: 999 }, // Parent doesn't exist
      ];

      const tree = repository._buildTree(flatFolders);

      // Should only return root, orphan is ignored
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe(1);
    });
  });
});

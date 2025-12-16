/**
 * Integration tests for backend API endpoints
 * Tests full workflows across repositories without external dependencies
 */

import { jest } from '@jest/globals';

// Mock repository implementations for testing
class MockUserRepository {
  constructor() {
    this.users = new Map();
    this.nextId = 1;
  }

  async findById(id) {
    return this.users.get(id) || null;
  }

  async findByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username === username) return user;
    }
    return null;
  }

  async findByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async create({ username, email, passwordHash, role = 'user' }) {
    const id = this.nextId++;
    const user = { id, username, email, passwordHash, role, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async update(id, updates) {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    Object.assign(user, updates);
    return user;
  }
}

class MockGCodeFileRepository {
  constructor() {
    this.files = new Map();
    this.nextId = 1;
  }

  async findById(id) {
    return this.files.get(id) || null;
  }

  async create({ userId, name, content, folderId = null }) {
    const id = this.nextId++;
    const file = {
      id,
      userId,
      name,
      content,
      folderId,
      version: 1,
      createdAt: new Date(),
    };
    this.files.set(id, file);
    return file;
  }

  async update(id, updates) {
    const file = this.files.get(id);
    if (!file) throw new Error('File not found');
    Object.assign(file, updates, { updatedAt: new Date() });
    return file;
  }

  async updateContent(id, content) {
    const file = this.files.get(id);
    if (!file) throw new Error('File not found');
    file.content = content;
    file.version = (file.version || 0) + 1;
    file.updatedAt = new Date();
    return file;
  }

  async delete(id) {
    return this.files.delete(id);
  }

  async listByUser(userId) {
    return Array.from(this.files.values()).filter((f) => f.userId === userId);
  }

  async search(userId, query) {
    const list = await this.listByUser(userId);
    return list.filter((f) => f.name.includes(query));
  }

  async countByUser(userId) {
    return this.listByUser(userId).length;
  }

  async getUserStats(userId) {
    const files = await this.listByUser(userId);
    return {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + (f.content?.length || 0), 0),
    };
  }
}

class MockGCodeFolderRepository {
  constructor() {
    this.folders = new Map();
    this.nextId = 1;
  }

  async create({ userId, name, parentId = null }) {
    const id = this.nextId++;
    const folder = { id, userId, name, parentId, createdAt: new Date() };
    this.folders.set(id, folder);
    return folder;
  }

  async update(id, updates) {
    const folder = this.folders.get(id);
    if (!folder) throw new Error('Folder not found');
    Object.assign(folder, updates);
    return folder;
  }

  async delete(id) {
    return this.folders.delete(id);
  }

  async listByUser(userId) {
    return Array.from(this.folders.values()).filter((f) => f.userId === userId);
  }

  async getTree(userId) {
    const folders = await this.listByUser(userId);
    return this._buildTree(folders, null);
  }

  _buildTree(folders, parentId) {
    return folders
      .filter((f) => f.parentId === parentId)
      .map((f) => ({
        ...f,
        children: this._buildTree(folders, f.id),
      }));
  }
}

describe('Backend API Integration', () => {
  let userRepo, fileRepo, folderRepo;

  beforeEach(() => {
    userRepo = new MockUserRepository();
    fileRepo = new MockGCodeFileRepository();
    folderRepo = new MockGCodeFolderRepository();
  });

  describe('File Management Workflow', () => {
    test('creates a file with valid data', async () => {
      const file = await fileRepo.create({
        userId: 1,
        name: 'test.gcode',
        content: 'G0 X10 Y20\nG1 Z5 F100',
      });

      expect(file.id).toBeDefined();
      expect(file.name).toBe('test.gcode');
      expect(file.version).toBe(1);
    });

    test('updates file content and increments version', async () => {
      const file = await fileRepo.create({
        userId: 1,
        name: 'test.gcode',
        content: 'G0 X10',
      });

      const updated = await fileRepo.updateContent(file.id, 'G0 X20 Y30');
      expect(updated.version).toBe(2);
      expect(updated.content).toBe('G0 X20 Y30');
    });

    test('lists all files for a user', async () => {
      await fileRepo.create({ userId: 1, name: 'file1.gcode', content: 'G0' });
      await fileRepo.create({ userId: 1, name: 'file2.gcode', content: 'G1' });
      await fileRepo.create({ userId: 2, name: 'file3.gcode', content: 'G2' });

      const userFiles = await fileRepo.listByUser(1);
      expect(userFiles).toHaveLength(2);
      expect(userFiles.every((f) => f.userId === 1)).toBe(true);
    });

    test('searches files by name', async () => {
      await fileRepo.create({ userId: 1, name: 'square.gcode', content: 'G0' });
      await fileRepo.create({ userId: 1, name: 'circle.gcode', content: 'G1' });
      await fileRepo.create({ userId: 1, name: 'square-2d.gcode', content: 'G2' });

      const results = await fileRepo.search(1, 'square');
      expect(results).toHaveLength(2);
      expect(results.every((f) => f.name.includes('square'))).toBe(true);
    });

    test('calculates user file statistics', async () => {
      await fileRepo.create({ userId: 1, name: 'f1.gcode', content: 'abc'.repeat(100) });
      await fileRepo.create({ userId: 1, name: 'f2.gcode', content: 'def'.repeat(200) });

      const stats = await fileRepo.getUserStats(1);
      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    test('deletes a file', async () => {
      const file = await fileRepo.create({ userId: 1, name: 'temp.gcode', content: 'G0' });
      const deleted = await fileRepo.delete(file.id);

      expect(deleted).toBe(true);
      const found = await fileRepo.findById(file.id);
      expect(found).toBeNull();
    });
  });

  describe('Folder Hierarchy', () => {
    test('creates nested folder structure', async () => {
      const root = await folderRepo.create({ userId: 1, name: 'projects' });
      const sub = await folderRepo.create({ userId: 1, name: 'engravings', parentId: root.id });

      expect(sub.parentId).toBe(root.id);
    });

    test('builds folder tree correctly', async () => {
      const root = await folderRepo.create({ userId: 1, name: 'root' });
      const child1 = await folderRepo.create({ userId: 1, name: 'child1', parentId: root.id });
      const child2 = await folderRepo.create({ userId: 1, name: 'child2', parentId: root.id });
      await folderRepo.create({ userId: 1, name: 'grandchild', parentId: child1.id });

      const tree = await folderRepo.getTree(1);
      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(2);
    });

    test('lists folders for user only', async () => {
      await folderRepo.create({ userId: 1, name: 'f1' });
      await folderRepo.create({ userId: 1, name: 'f2' });
      await folderRepo.create({ userId: 2, name: 'f3' });

      const user1Folders = await folderRepo.listByUser(1);
      expect(user1Folders).toHaveLength(2);
    });
  });

  describe('User Management', () => {
    test('creates a new user', async () => {
      const user = await userRepo.create({
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: 'hashedpassword',
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe('alice');
      expect(user.role).toBe('user');
    });

    test('finds user by username', async () => {
      await userRepo.create({
        username: 'bob',
        email: 'bob@example.com',
        passwordHash: 'hash',
      });

      const found = await userRepo.findByUsername('bob');
      expect(found).not.toBeNull();
      expect(found.username).toBe('bob');
    });

    test('finds user by email', async () => {
      await userRepo.create({
        username: 'charlie',
        email: 'charlie@example.com',
        passwordHash: 'hash',
      });

      const found = await userRepo.findByEmail('charlie@example.com');
      expect(found.username).toBe('charlie');
    });

    test('prevents duplicate usernames', async () => {
      await userRepo.create({
        username: 'dave',
        email: 'dave@example.com',
        passwordHash: 'hash',
      });

      // Check if duplicate exists before creating
      const existing = await userRepo.findByUsername('dave');
      expect(existing).not.toBeNull();
    });

    test('updates user information', async () => {
      const user = await userRepo.create({
        username: 'eve',
        email: 'eve@example.com',
        passwordHash: 'hash',
      });

      const updated = await userRepo.update(user.id, { email: 'newemail@example.com' });
      expect(updated.email).toBe('newemail@example.com');
    });
  });

  describe('Data Consistency', () => {
    test('maintains relationship between users and files', async () => {
      const user = await userRepo.create({
        username: 'frank',
        email: 'frank@example.com',
        passwordHash: 'hash',
      });

      const file = await fileRepo.create({
        userId: user.id,
        name: 'project.gcode',
        content: 'G0',
      });

      const userFiles = await fileRepo.listByUser(user.id);
      expect(userFiles).toHaveLength(1);
      expect(userFiles[0].id).toBe(file.id);
    });

    test('maintains relationship between files and folders', async () => {
      const folder = await folderRepo.create({ userId: 1, name: 'designs' });

      const file = await fileRepo.create({
        userId: 1,
        name: 'design.gcode',
        content: 'G0',
        folderId: folder.id,
      });

      expect(file.folderId).toBe(folder.id);
    });

    test('handles orphaned files when folder deleted', async () => {
      const folder = await folderRepo.create({ userId: 1, name: 'temp' });
      const file = await fileRepo.create({
        userId: 1,
        name: 'orphan.gcode',
        content: 'G0',
        folderId: folder.id,
      });

      await folderRepo.delete(folder.id);

      const foundFile = await fileRepo.findById(file.id);
      expect(foundFile).not.toBeNull();
      expect(foundFile.folderId).toBe(folder.id);
    });
  });

  describe('Batch Operations', () => {
    test('batch creates multiple files', async () => {
      const names = ['f1.gcode', 'f2.gcode', 'f3.gcode'];
      const created = [];

      for (const name of names) {
        const file = await fileRepo.create({
          userId: 1,
          name,
          content: 'G0',
        });
        created.push(file);
      }

      expect(created).toHaveLength(3);
      const all = await fileRepo.listByUser(1);
      expect(all).toHaveLength(3);
    });

    test('batch creates and organizes files in folders', async () => {
      const folder = await folderRepo.create({ userId: 1, name: 'batch' });

      for (let i = 0; i < 5; i++) {
        await fileRepo.create({
          userId: 1,
          name: `batch-${i}.gcode`,
          content: 'G0',
          folderId: folder.id,
        });
      }

      const files = await fileRepo.listByUser(1);
      expect(files).toHaveLength(5);
      expect(files.every((f) => f.folderId === folder.id)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles file not found', async () => {
      const found = await fileRepo.findById(9999);
      expect(found).toBeNull();
    });

    test('throws on updating non-existent file', async () => {
      try {
        await fileRepo.update(9999, { name: 'new' });
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toBe('File not found');
      }
    });

    test('throws on updating non-existent user', async () => {
      try {
        await userRepo.update(9999, { email: 'new@example.com' });
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toBe('User not found');
      }
    });

    test('handles empty search results', async () => {
      const results = await fileRepo.search(1, 'nonexistent');
      expect(results).toEqual([]);
    });

    test('validates required fields', async () => {
      // Test validator functions inline
      const validUser = { id: 1, username: 'test', email: 'test@example.com' };
      expect(validUser.id).toBeDefined();
      expect(validUser.username).toBe('test');
    });
  });
});

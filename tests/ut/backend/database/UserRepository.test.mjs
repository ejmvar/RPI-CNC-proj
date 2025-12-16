/**
 * Unit tests for UserRepository
 */

import { jest } from '@jest/globals';

// Mock the connection module before importing UserRepository
const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.unstable_mockModule('../../../../modules/backend/database/connection.mjs', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

// Mock the auth module
const mockHashPassword = jest.fn();
jest.unstable_mockModule('../../../../modules/backend/security/auth.mjs', () => ({
  hashPassword: mockHashPassword,
}));

// Now import the repository
const { UserRepository } = await import(
  '../../../../modules/backend/database/repositories/UserRepository.mjs'
);

describe('UserRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new UserRepository();
    jest.clearAllMocks();
    mockHashPassword.mockResolvedValue('hashed_password');
  });

  describe('findById', () => {
    test('returns user when found', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await repository.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
        [1]
      );
    });

    test('returns null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    test('returns user when found', async () => {
      const mockUser = { id: 1, username: 'testuser' };
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await repository.findByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE username = $1 AND is_active = TRUE',
        ['testuser']
      );
    });

    test('returns null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    test('returns user when found', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
        ['test@example.com']
      );
    });
  });

  describe('create', () => {
    test('creates user with default role', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      };

      const mockCreatedUser = { id: 1, ...userData, role: 'user' };
      mockQuery.mockResolvedValue({ rows: [mockCreatedUser] });

      const result = await repository.create(userData);

      expect(result).toEqual(mockCreatedUser);
      expect(mockHashPassword).toHaveBeenCalledWith('password123');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'), [
        'newuser',
        'new@example.com',
        'hashed_password',
        'New User',
        'user',
      ]);
    });

    test('creates user with custom role', async () => {
      const userData = {
        username: 'adminuser',
        email: 'admin@example.com',
        password: 'password123',
        displayName: 'Admin User',
        role: 'admin',
      };

      const mockCreatedUser = { id: 2, ...userData };
      mockQuery.mockResolvedValue({ rows: [mockCreatedUser] });

      await repository.create(userData);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'), [
        'adminuser',
        'admin@example.com',
        'hashed_password',
        'Admin User',
        'admin',
      ]);
    });
  });

  describe('update', () => {
    test('updates allowed fields', async () => {
      const updates = {
        email: 'updated@example.com',
        displayName: 'Updated Name',
      };

      const mockUpdatedUser = { id: 1, ...updates };
      mockQuery.mockResolvedValue({ rows: [mockUpdatedUser] });

      const result = await repository.update(1, updates);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['updated@example.com', 'Updated Name', 1])
      );
    });

    test('throws error when no valid fields to update', async () => {
      await expect(repository.update(1, { invalid: 'field' })).rejects.toThrow(
        'No valid fields to update'
      );
    });

    test('returns null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.update(999, { email: 'new@example.com' });

      expect(result).toBeNull();
    });
  });

  describe('updatePassword', () => {
    test('updates user password', async () => {
      const mockUser = { id: 1, username: 'testuser' };
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await repository.updatePassword(1, 'newpassword');

      expect(result).toEqual(mockUser);
      expect(mockHashPassword).toHaveBeenCalledWith('newpassword');
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *',
        ['hashed_password', 1]
      );
    });
  });

  describe('updateLastLogin', () => {
    test('updates last login timestamp', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.updateLastLogin(1);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [1]
      );
    });
  });

  describe('deactivate', () => {
    test('soft deletes user', async () => {
      const mockUser = { id: 1, is_active: false };
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await repository.deactivate(1);

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING *',
        [1]
      );
    });
  });

  describe('list', () => {
    test('lists users with default pagination', async () => {
      const mockUsers = [
        { id: 1, username: 'user1' },
        { id: 2, username: 'user2' },
      ];
      mockQuery.mockResolvedValue({ rows: mockUsers });

      const result = await repository.list();

      expect(result).toEqual(mockUsers);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM users'), [50, 0]);
    });

    test('filters users by role', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.list({ role: 'admin', limit: 10, offset: 5 });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('role = $1'), [
        'admin',
        10,
        5,
      ]);
    });

    test('filters users by verification status', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.list({ isVerified: true });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('is_verified = $1'), [
        true,
        50,
        0,
      ]);
    });

    test('combines multiple filters', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.list({ role: 'user', isVerified: false, limit: 20, offset: 10 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/role = \$1.*is_verified = \$2/),
        ['user', false, 20, 10]
      );
    });
  });

  describe('count', () => {
    test('counts all active users when no filters', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '42' }] });

      const result = await repository.count();

      expect(result).toBe(42);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'), []);
    });

    test('counts users by role', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await repository.count({ role: 'admin' });

      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('role = $1'), ['admin']);
    });
  });

  describe('search', () => {
    test('searches users by query string', async () => {
      const mockUsers = [{ id: 1, username: 'testuser', email: 'test@example.com' }];
      mockQuery.mockResolvedValue({ rows: mockUsers });

      const result = await repository.search('test');

      expect(result).toEqual(mockUsers);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('username ILIKE'), [
        '%test%',
        20,
      ]);
    });

    test('searches with custom limit', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.search('user', 10);

      expect(mockQuery).toHaveBeenCalledWith(expect.anything(), ['%user%', 10]);
    });
  });
});

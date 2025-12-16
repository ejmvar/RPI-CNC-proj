/**
 * Authentication API Routes
 */

import express from 'express';
import { authenticate } from '../security/auth.mjs';
import userRepository from '../database/repositories/UserRepository.mjs';
import { generateToken, verifyPassword } from '../security/auth.mjs';
import logger from '../logging/logger.mjs';
import { operationsTotal } from '../monitoring/metrics.mjs';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check username length
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be 3-50 characters' });
    }

    // Check password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existingUser = await userRepository.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Create user
    const user = await userRepository.create({
      username,
      email,
      password,
      displayName: displayName || username,
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    operationsTotal.labels('register').inc();
    logger.info('User registered', { userId: user.id, username: user.username });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message });
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Login with username/email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username or email
    let user = await userRepository.findByUsername(username);
    if (!user) {
      user = await userRepository.findByEmail(username);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Generate token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    operationsTotal.labels('login').inc();
    logger.info('User logged in', { userId: user.id, username: user.username });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await userRepository.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      isVerified: user.is_verified,
    });
  } catch (error) {
    logger.error('Get profile error', { error: error.message });
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { email, displayName } = req.body;
    const updates = {};

    if (email) updates.email = email;
    if (displayName) updates.displayName = displayName;

    const user = await userRepository.update(req.user.userId, updates);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    operationsTotal.labels('profile_update').inc();
    logger.info('Profile updated', { userId: user.id });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
    });
  } catch (error) {
    logger.error('Update profile error', { error: error.message });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Verify current password
    const user = await userRepository.findById(req.user.userId);
    const isValid = await verifyPassword(currentPassword, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await userRepository.updatePassword(req.user.userId, newPassword);

    operationsTotal.labels('password_change').inc();
    logger.info('Password changed', { userId: user.id });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Password change error', { error: error.message });
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client should discard token)
 */
router.post('/logout', authenticate, (req, res) => {
  operationsTotal.labels('logout').inc();
  logger.info('User logged out', { userId: req.user.userId });
  res.json({ message: 'Logged out successfully' });
});

export default router;

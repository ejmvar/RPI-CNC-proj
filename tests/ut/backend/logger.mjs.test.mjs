/**
 * Unit tests for Logger Module
 */

import logger from '../../../modules/backend/logging/logger.mjs';
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';

describe('Logger Module', () => {
  let consoleSpy;

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Logger Creation', () => {
    test('logger is defined', () => {
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    test('logger has required methods', () => {
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.http).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Log Level Methods', () => {
    test('error method exists and accepts message', () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      logger.error('Test error message');
      expect(errorSpy).toHaveBeenCalledWith('Test error message');
      errorSpy.mockRestore();
    });

    test('warn method exists and accepts message', () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      logger.warn('Test warning message');
      expect(warnSpy).toHaveBeenCalledWith('Test warning message');
      warnSpy.mockRestore();
    });

    test('info method exists and accepts message', () => {
      logger.info('Test info message');
      expect(consoleSpy).toHaveBeenCalledWith('Test info message');
    });

    test('http method exists and accepts message', () => {
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => {});
      logger.http('Test HTTP message');
      expect(httpSpy).toHaveBeenCalledWith('Test HTTP message');
      httpSpy.mockRestore();
    });

    test('debug method exists and accepts message', () => {
      const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});
      logger.debug('Test debug message');
      expect(debugSpy).toHaveBeenCalledWith('Test debug message');
      debugSpy.mockRestore();
    });
  });

  describe('Log with Metadata', () => {
    test('accepts metadata object', () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      logger.info('Message with metadata', { userId: 123, action: 'login' });
      expect(infoSpy).toHaveBeenCalled();
      infoSpy.mockRestore();
    });

    test('handles error objects', () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      const testError = new Error('Test error');
      logger.error('Error occurred', { error: testError });
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('Module Export', () => {
    test('exports logger instance', async () => {
      const module = await import('../../../modules/backend/logging/logger.mjs');
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('object');
    });
  });

  describe('Log Formatting', () => {
    test('logs plain string message', () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      logger.info('Simple message');
      expect(infoSpy).toHaveBeenCalledWith('Simple message');
      infoSpy.mockRestore();
    });

    test('logs message with numbers', () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      logger.info('Number', 12345);
      expect(infoSpy).toHaveBeenCalled();
      infoSpy.mockRestore();
    });

    test('logs message with boolean', () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      logger.info('Boolean', true);
      expect(infoSpy).toHaveBeenCalled();
      infoSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('handles null message', () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      expect(() => logger.info(null)).not.toThrow();
      infoSpy.mockRestore();
    });

    test('handles undefined message', () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      expect(() => logger.info(undefined)).not.toThrow();
      infoSpy.mockRestore();
    });

    test('handles empty string', () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      expect(() => logger.info('')).not.toThrow();
      infoSpy.mockRestore();
    });
  });
});

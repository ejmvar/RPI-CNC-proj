/**
 * File System API
 * Phase 15.1: Desktop Application
 *
 * Provides native file system operations for Electron
 */

import fs from 'fs';
import path from 'path';

export class FileSystemAPI {
  /**
   * Read file contents
   */
  static readFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        success: true,
        content,
        path: filePath,
        size: Buffer.byteLength(content, 'utf-8'),
        modified: fs.statSync(filePath).mtime.toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath,
      };
    }
  }

  /**
   * Write file contents
   */
  static writeFile(filePath, content) {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return {
        success: true,
        path: filePath,
        size: Buffer.byteLength(content, 'utf-8'),
        modified: fs.statSync(filePath).mtime.toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath,
      };
    }
  }

  /**
   * Check if file exists
   */
  static fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * Get file info
   */
  static getFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        success: true,
        path: filePath,
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath,
      };
    }
  }

  /**
   * List directory contents
   */
  static listDirectory(dirPath) {
    try {
      const files = fs.readdirSync(dirPath);
      const items = files.map((file) => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      });

      return {
        success: true,
        path: dirPath,
        items,
        count: items.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: dirPath,
      };
    }
  }

  /**
   * Delete file
   */
  static deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return {
        success: true,
        path: filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath,
      };
    }
  }

  /**
   * Create directory
   */
  static createDirectory(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return {
        success: true,
        path: dirPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: dirPath,
      };
    }
  }

  /**
   * Watch file for changes
   */
  static watchFile(filePath, callback) {
    try {
      const watcher = fs.watch(filePath, (eventType, filename) => {
        callback({
          success: true,
          eventType,
          filename,
          path: filePath,
          timestamp: new Date().toISOString(),
        });
      });

      return {
        success: true,
        path: filePath,
        watcher,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath,
      };
    }
  }

  /**
   * Copy file
   */
  static copyFile(sourcePath, destPath) {
    try {
      fs.copyFileSync(sourcePath, destPath);
      return {
        success: true,
        source: sourcePath,
        destination: destPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        source: sourcePath,
        destination: destPath,
      };
    }
  }

  /**
   * Get recent files
   */
  static getRecentFiles(dirPath, maxCount = 10) {
    try {
      const files = fs.readdirSync(dirPath);
      const withStats = files
        .filter((f) => f.endsWith('.gcode') || f.endsWith('.nc'))
        .map((file) => {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            modified: stats.mtime,
            size: stats.size,
          };
        })
        .sort((a, b) => b.modified - a.modified)
        .slice(0, maxCount);

      return {
        success: true,
        path: dirPath,
        files: withStats.map((f) => ({
          ...f,
          modified: f.modified.toISOString(),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: dirPath,
      };
    }
  }
}

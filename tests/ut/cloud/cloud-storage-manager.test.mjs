/**
 * Unit Tests: Cloud Storage Manager
 * Phase 17: Cloud Integration & Collaboration
 */

import CloudStorageManager from '../../../modules/cloud/cloud-storage-manager.mjs';

describe('CloudStorageManager', () => {
  let manager;

  beforeEach(() => {
    manager = new CloudStorageManager({
      providers: {
        aws: { enabled: true, region: 'us-east-1' },
        local: { enabled: true, basePath: '/tmp/storage' },
      },
    });
  });

  describe('uploadFile', () => {
    test('should upload file successfully', () => {
      const result = manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        fileContent: 'G01 X10 Y20',
        fileSize: 200,
        provider: 'local',
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.versionId).toBeDefined();
      expect(result.cloudUrl).toBeDefined();
      expect(result.checksum).toBeDefined();
    });

    test('should throw error without projectId', () => {
      expect(() => {
        manager.uploadFile({
          fileName: 'test.gcode',
          fileContent: 'G01 X10 Y20',
        });
      }).toThrow('File upload requires projectId, fileName, and fileContent');
    });

    test('should track upload progress', () => {
      const uploadId = manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        fileContent: 'G01 X10 Y20',
        fileSize: 200,
        provider: 'local',
      }).uploadId;

      const progress = manager.activeUploads[uploadId];
      expect(progress).toBeDefined();
      expect(progress.status).toBe('COMPLETED');
    });
  });

  describe('downloadFile', () => {
    test('should download file after upload', () => {
      const upload = manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        fileContent: 'G01 X10 Y20',
        fileSize: 200,
        provider: 'local',
      });

      const download = manager.downloadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        versionId: upload.versionId,
        provider: 'local',
      });

      expect(download.status).toBe('COMPLETED');
      expect(download.fileContent).toBeDefined();
    });

    test('should throw error for missing download params', () => {
      expect(() => {
        manager.downloadFile({
          projectId: 'proj_123',
        });
      }).toThrow('File download requires projectId and fileName');
    });
  });

  describe('getVersionHistory', () => {
    test('should return version history for file', () => {
      const filePath = 'projects/proj_123/test.gcode';

      manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        fileContent: 'V1',
        provider: 'local',
      });

      manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        fileContent: 'V2',
        provider: 'local',
      });

      const history = manager.getVersionHistory({ filePath });

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].versionId).toBeDefined();
      expect(history[0].uploadedAt).toBeDefined();
    });

    test('should return empty history for non-existent file', () => {
      const history = manager.getVersionHistory({
        filePath: 'projects/unknown/file.gcode',
      });

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('restoreFileVersion', () => {
    test('should restore previous version', () => {
      const upload1 = manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        fileContent: 'V1',
        provider: 'local',
      });

      manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        fileContent: 'V2',
        provider: 'local',
      });

      const restore = manager.restoreFileVersion({
        filePath: 'projects/proj_123/test.gcode',
        versionId: upload1.versionId,
      });

      expect(restore.status).toBe('RESTORED');
      expect(restore.restoredVersionId).toBe(upload1.versionId);
    });
  });

  describe('listFiles', () => {
    test('should list files in project', () => {
      manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'file1.gcode',
        fileContent: 'content1',
        provider: 'local',
      });

      manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'file2.gcode',
        fileContent: 'content2',
        provider: 'local',
      });

      const files = manager.listFiles({ projectId: 'proj_123' });

      expect(files.length).toBeGreaterThan(0);
      expect(files[0].fileName).toBeDefined();
      expect(files[0].uploadedAt).toBeDefined();
    });
  });

  describe('configureAutoBackup', () => {
    test('should configure auto-backup', () => {
      const result = manager.configureAutoBackup({
        projectId: 'proj_123',
        intervalHours: 24,
        retentionDays: 30,
        compressionEnabled: true,
      });

      expect(result.status).toBe('CONFIGURED');
      expect(result.intervalHours).toBe(24);
      expect(result.retentionDays).toBe(30);
    });

    test('should throw error without projectId', () => {
      expect(() => {
        manager.configureAutoBackup({
          intervalHours: 24,
        });
      }).toThrow('Auto-backup requires projectId');
    });
  });

  describe('getStorageUsage', () => {
    test('should return storage usage stats', () => {
      manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        fileContent: 'test content',
        fileSize: 500,
        provider: 'local',
      });

      const usage = manager.getStorageUsage({ projectId: 'proj_123' });

      expect(usage.totalUsageBytes).toBeGreaterThan(0);
      expect(usage.fileCount).toBeGreaterThan(0);
      expect(usage.versionCount).toBeDefined();
    });
  });

  describe('event system', () => {
    test('should emit upload event', (done) => {
      manager.on('file:uploaded', (data) => {
        expect(data.fileName).toBe('test.gcode');
        done();
      });

      manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        fileContent: 'content',
        provider: 'local',
      });
    });

    test('should emit download event', (done) => {
      const upload = manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        fileContent: 'content',
        provider: 'local',
      });

      manager.on('file:downloaded', (data) => {
        expect(data.fileName).toBe('test.gcode');
        done();
      });

      manager.downloadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        versionId: upload.versionId,
        provider: 'local',
      });
    });
  });

  describe('statistics', () => {
    test('should return accurate statistics', () => {
      manager.uploadFile({
        projectId: 'proj_123',
        fileName: 'test.gcode',
        fileContent: 'content',
        provider: 'local',
      });

      const stats = manager.getStatistics();

      expect(stats.totalUploads).toBeGreaterThan(0);
      expect(stats.totalDownloads).toBeGreaterThanOrEqual(0);
      expect(stats.totalVersions).toBeGreaterThan(0);
      expect(stats.timestamp).toBeDefined();
    });
  });
});

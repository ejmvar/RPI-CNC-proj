/**
 * Unit Tests: Project & Sharing Manager
 * Phase 17: Cloud Integration & Collaboration
 */

import ProjectSharingManager from '../../../modules/cloud/project-sharing-manager.mjs';

describe('ProjectSharingManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ProjectSharingManager();
  });

  describe('createProject', () => {
    test('should create project successfully', () => {
      const project = manager.createProject({
        projectName: 'Test CNC Project',
        userId: 'user_123',
        description: 'A test CNC project',
      });

      expect(project.projectId).toBeDefined();
      expect(project.projectName).toBe('Test CNC Project');
      expect(project.owner).toBe('user_123');
      expect(project.status).toBe('ACTIVE');
    });

    test('should throw error without projectName', () => {
      expect(() => {
        manager.createProject({
          userId: 'user_123',
        });
      }).toThrow('Project creation requires projectName and userId');
    });

    test('should assign ADMIN role to owner', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      const userRole = manager._getUserRoleForProject('user_123', project.projectId);
      expect(userRole).toBe('ADMIN');
    });
  });

  describe('shareProject', () => {
    test('should share project with user', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      const share = manager.shareProject({
        projectId: project.projectId,
        userId: 'user_456',
        role: 'EDITOR',
        inviterUserId: 'user_123',
      });

      expect(share.status).toBe('SHARED');
      expect(share.grantedRole).toBe('EDITOR');
    });

    test('should emit share event', (done) => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      manager.on('project:shared', (data) => {
        expect(data.projectId).toBe(project.projectId);
        expect(data.role).toBe('VIEWER');
        done();
      });

      manager.shareProject({
        projectId: project.projectId,
        userId: 'user_789',
        role: 'VIEWER',
        inviterUserId: 'user_123',
      });
    });

    test('should throw error for invalid role', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      expect(() => {
        manager.shareProject({
          projectId: project.projectId,
          userId: 'user_456',
          role: 'INVALID_ROLE',
          inviterUserId: 'user_123',
        });
      }).toThrow();
    });
  });

  describe('updateUserPermissions', () => {
    test('should update user role in project', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      manager.shareProject({
        projectId: project.projectId,
        userId: 'user_456',
        role: 'VIEWER',
        inviterUserId: 'user_123',
      });

      const update = manager.updateUserPermissions({
        projectId: project.projectId,
        userId: 'user_456',
        newRole: 'EDITOR',
        updatedBy: 'user_123',
      });

      expect(update.status).toBe('UPDATED');
      expect(update.newRole).toBe('EDITOR');
    });

    test('should track permission changes in audit log', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      manager.shareProject({
        projectId: project.projectId,
        userId: 'user_456',
        role: 'VIEWER',
        inviterUserId: 'user_123',
      });

      manager.updateUserPermissions({
        projectId: project.projectId,
        userId: 'user_456',
        newRole: 'EDITOR',
        updatedBy: 'user_123',
      });

      const audit = manager.getAuditLog({ projectId: project.projectId });
      expect(audit.length).toBeGreaterThan(0);
    });
  });

  describe('revokeAccess', () => {
    test('should revoke user access to project', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      manager.shareProject({
        projectId: project.projectId,
        userId: 'user_456',
        role: 'EDITOR',
        inviterUserId: 'user_123',
      });

      const revoke = manager.revokeAccess({
        projectId: project.projectId,
        userId: 'user_456',
        revokedBy: 'user_123',
      });

      expect(revoke.status).toBe('REVOKED');
    });

    test('should prevent non-admin from revoking', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      manager.shareProject({
        projectId: project.projectId,
        userId: 'user_456',
        role: 'EDITOR',
        inviterUserId: 'user_123',
      });

      expect(() => {
        manager.revokeAccess({
          projectId: project.projectId,
          userId: 'user_789',
          revokedBy: 'user_456',
        });
      }).toThrow();
    });

    test('should emit revoke event', (done) => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      manager.shareProject({
        projectId: project.projectId,
        userId: 'user_456',
        role: 'EDITOR',
        inviterUserId: 'user_123',
      });

      manager.on('access:revoked', (data) => {
        expect(data.userId).toBe('user_456');
        done();
      });

      manager.revokeAccess({
        projectId: project.projectId,
        userId: 'user_456',
        revokedBy: 'user_123',
      });
    });
  });

  describe('getProjectMembers', () => {
    test('should return all project members', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      manager.shareProject({
        projectId: project.projectId,
        userId: 'user_456',
        role: 'EDITOR',
        inviterUserId: 'user_123',
      });

      manager.shareProject({
        projectId: project.projectId,
        userId: 'user_789',
        role: 'VIEWER',
        inviterUserId: 'user_123',
      });

      const members = manager.getProjectMembers({ projectId: project.projectId });

      expect(members.length).toBe(3); // Owner + 2 shared
      expect(members[0].userId).toBe('user_123');
    });
  });

  describe('getUserProjects', () => {
    test('should return user projects with permissions', () => {
      const proj1 = manager.createProject({
        projectName: 'Project 1',
        userId: 'user_123',
      });

      const proj2 = manager.createProject({
        projectName: 'Project 2',
        userId: 'user_456',
      });

      manager.shareProject({
        projectId: proj2.projectId,
        userId: 'user_123',
        role: 'EDITOR',
        inviterUserId: 'user_456',
      });

      const projects = manager.getUserProjects({ userId: 'user_123' });

      expect(projects.length).toBe(2);
      expect(projects[0].projectName).toBe('Project 1');
      expect(projects[1].projectName).toBe('Project 2');
    });
  });

  describe('getAuditLog', () => {
    test('should log all project changes', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      manager.shareProject({
        projectId: project.projectId,
        userId: 'user_456',
        role: 'EDITOR',
        inviterUserId: 'user_123',
      });

      const audit = manager.getAuditLog({ projectId: project.projectId });

      expect(audit.length).toBeGreaterThan(0);
      expect(audit[0].action).toBeDefined();
      expect(audit[0].timestamp).toBeDefined();
    });

    test('should track user and action in audit', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      manager.shareProject({
        projectId: project.projectId,
        userId: 'user_456',
        role: 'EDITOR',
        inviterUserId: 'user_123',
      });

      const audit = manager.getAuditLog({ projectId: project.projectId });
      const shareEntry = audit.find((a) => a.action === 'SHARED');

      expect(shareEntry).toBeDefined();
      expect(shareEntry.performedBy).toBe('user_123');
    });
  });

  describe('RBAC', () => {
    test('should enforce ADMIN only permissions', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      manager.shareProject({
        projectId: project.projectId,
        userId: 'user_456',
        role: 'VIEWER',
        inviterUserId: 'user_123',
      });

      expect(() => {
        manager.updateUserPermissions({
          projectId: project.projectId,
          userId: 'user_789',
          newRole: 'EDITOR',
          updatedBy: 'user_456',
        });
      }).toThrow();
    });

    test('should verify user has required permission', () => {
      const project = manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });

      const hasPermission = manager.userHasPermission({
        userId: 'user_123',
        projectId: project.projectId,
        permission: 'WRITE',
      });

      expect(hasPermission).toBe(true);
    });
  });

  describe('event system', () => {
    test('should emit project created event', (done) => {
      manager.on('project:created', (data) => {
        expect(data.projectName).toBe('Test Project');
        done();
      });

      manager.createProject({
        projectName: 'Test Project',
        userId: 'user_123',
      });
    });
  });

  describe('statistics', () => {
    test('should return project statistics', () => {
      manager.createProject({
        projectName: 'Project 1',
        userId: 'user_123',
      });

      manager.createProject({
        projectName: 'Project 2',
        userId: 'user_456',
      });

      const stats = manager.getStatistics();

      expect(stats.totalProjects).toBe(2);
      expect(stats.totalUsers).toBeGreaterThan(0);
      expect(stats.timestamp).toBeDefined();
    });
  });
});

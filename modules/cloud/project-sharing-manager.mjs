/**
 * Project & Sharing Manager
 * Phase 17: Cloud Integration & Collaboration
 *
 * Manages projects, permissions, and sharing:
 * - Project creation and management
 * - User access control (RBAC)
 * - Sharing with specific permissions
 * - Audit logging
 */

export class ProjectSharingManager {
  constructor(options = {}) {
    this.options = {
      maxProjectsPerUser: options.maxProjectsPerUser || 50,
      maxSharedUsers: options.maxSharedUsers || 100,
      auditLoggingEnabled: options.auditLoggingEnabled || true,
      ...options,
    };

    this.projects = new Map(); // projectId -> project data
    this.permissions = new Map(); // projectId -> [{ userId, role, permissions }]
    this.auditLog = [];
    this.listeners = {};
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Emit event to registered listeners
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  /**
   * Create new project
   */
  createProject(params) {
    // Tests use `userId` as the owner param; accept either `ownerId` or `userId`.
    const ownerId = (params && (params.ownerId || params.userId)) || null;
    if (!params || !params.projectName || !ownerId) {
      throw new Error('Project creation requires projectName and userId');
    }

    const { projectName, description = '', isPublic = false, tags = [] } = params;

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const project = {
      projectId,
      projectName,
      description,
      ownerId,
      isPublic,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memberCount: 1,
      fileCount: 0,
      status: 'ACTIVE',
    };

    this.projects.set(projectId, project);

    // Set owner as admin
    if (!this.permissions.has(projectId)) {
      this.permissions.set(projectId, []);
    }
    this.permissions.get(projectId).push({
      userId: ownerId,
      role: 'ADMIN',
      permissions: ['READ', 'WRITE', 'DELETE', 'SHARE', 'INVITE'],
      grantedAt: Date.now(),
    });

    this._logAudit({
      projectId,
      action: 'PROJECT_CREATED',
      userId: ownerId,
      details: { projectName },
    });

    this.emit('project:created', project);

    return project;
  }

  /**
   * Share project with user
   */
  shareProject(params) {
    // Tests use `userId` and `inviterUserId` names; support both sets.
    if (!params || !params.projectId || !(params.userId || params.targetUserId)) {
      throw new Error('Sharing requires projectId and userId');
    }

    const projectId = params.projectId;
    const targetUserId = params.userId || params.targetUserId;
    const role = params.role || 'VIEWER';
    const invitedBy = params.inviterUserId || params.grantedByUserId || null;

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Validate role-based permissions
    const rolePermissions = {
      ADMIN: ['READ', 'WRITE', 'DELETE', 'SHARE', 'INVITE'],
      EDITOR: ['READ', 'WRITE', 'INVITE'],
      COMMENTER: ['READ', 'COMMENT'],
      VIEWER: ['READ'],
    };

    if (!rolePermissions[role]) {
      throw new Error(`Invalid role: ${role}`);
    }

    const permissions = this.permissions.get(projectId) || [];

    // Check if already shared
    const existing = permissions.find((p) => p.userId === targetUserId);
    if (existing) {
      existing.role = role;
      existing.permissions = rolePermissions[role];
      existing.updatedAt = Date.now();
    } else {
      permissions.push({
        userId: targetUserId,
        role,
        permissions: rolePermissions[role],
        grantedAt: Date.now(),
      });
      project.memberCount++;
    }

    this.permissions.set(projectId, permissions);
    project.updatedAt = Date.now();

    this._logAudit({
      projectId,
      action: 'SHARED',
      userId: invitedBy,
      performedBy: invitedBy,
      details: { targetUserId, role },
    });

    this.emit('project:shared', {
      projectId,
      role,
      userId: targetUserId,
    });

    return {
      status: 'SHARED',
      projectId,
      grantedRole: role,
      grantedTo: targetUserId,
      grantedAt: Date.now(),
    };
  }

  /**
   * Update user permissions
   */
  updateUserPermissions(params) {
    // Support either `newRole` (tests) or full `permissions` array
    if (!params || !params.projectId || !params.userId) {
      throw new Error('Permission update requires projectId and userId');
    }

    const { projectId, userId, newRole, updatedBy, permissions } = params;

    const perms = this.permissions.get(projectId);
    if (!perms) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // only ADMIN can update permissions
    const updater = perms.find((p) => p.userId === updatedBy);
    if (!updater || updater.role !== 'ADMIN') {
      throw new Error('Only ADMIN can update permissions');
    }

    const userPerm = perms.find((p) => p.userId === userId);
    if (!userPerm) {
      throw new Error(`User not a member of project: ${userId}`);
    }

    // If newRole provided, map to permissions
    const rolePermissions = {
      ADMIN: ['READ', 'WRITE', 'DELETE', 'SHARE', 'INVITE'],
      EDITOR: ['READ', 'WRITE', 'INVITE'],
      COMMENTER: ['READ', 'COMMENT'],
      VIEWER: ['READ'],
    };

    if (newRole) {
      if (!rolePermissions[newRole]) throw new Error(`Invalid role: ${newRole}`);
      userPerm.role = newRole;
      userPerm.permissions = rolePermissions[newRole];
    } else if (permissions) {
      const validPermissions = ['READ', 'WRITE', 'DELETE', 'SHARE', 'INVITE', 'COMMENT'];
      const invalidPerms = permissions.filter((p) => !validPermissions.includes(p));
      if (invalidPerms.length > 0) {
        throw new Error(`Invalid permissions: ${invalidPerms.join(', ')}`);
      }
      userPerm.permissions = permissions;
    }

    userPerm.updatedAt = Date.now();

    this._logAudit({
      projectId,
      action: 'UPDATED',
      userId: updatedBy,
      details: { userId, newRole: userPerm.role },
      performedBy: updatedBy,
    });

    this.emit('permissions:updated', { projectId, userId, newRole: userPerm.role });

    return { status: 'UPDATED', projectId, userId, newRole: userPerm.role };
  }

  /**
   * Revoke access
   */
  revokeAccess(params) {
    if (!params || !params.projectId || !params.userId) {
      throw new Error('Revoke requires projectId and userId');
    }

    const { projectId, userId, revokedBy } = params;

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const perms = this.permissions.get(projectId);
    if (!perms) {
      return { message: 'No permissions to revoke' };
    }

    // Only ADMIN can revoke
    const revoker = perms.find((p) => p.userId === revokedBy);
    if (!revoker || revoker.role !== 'ADMIN') {
      throw new Error('Only ADMIN can revoke access');
    }

    const index = perms.findIndex((p) => p.userId === userId);
    if (index > -1) {
      perms.splice(index, 1);
      project.memberCount = Math.max(1, project.memberCount - 1);

      this._logAudit({
        projectId,
        action: 'REVOKED',
        userId: revokedBy,
        performedBy: revokedBy,
        details: { targetUserId: userId },
      });

      this.emit('access:revoked', { projectId, userId });

      return { projectId, userId, status: 'REVOKED', timestamp: Date.now() };
    }

    return { message: 'User not found in project' };
  }

  /**
   * Get project members and permissions
   */
  getProjectMembers(params) {
    if (!params || !params.projectId) {
      throw new Error('Get members requires projectId');
    }

    const { projectId } = params;

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const perms = this.permissions.get(projectId) || [];

    // Return an array of members (owner first)
    const members = perms
      .map((p) => ({
        userId: p.userId,
        role: p.role,
        permissions: p.permissions,
        grantedAt: p.grantedAt,
        isOwner: p.userId === project.ownerId,
      }))
      .sort((a, b) => (b.isOwner === true ? 1 : 0) - (a.isOwner === true ? 1 : 0));

    return members;
  }

  /**
   * Get user's projects
   */
  getUserProjects(params) {
    if (!params || !params.userId) {
      throw new Error('Get projects requires userId');
    }

    const { userId } = params;

    const userProjects = Array.from(this.projects.values())
      .filter((p) => {
        const perms = this.permissions.get(p.projectId) || [];
        return p.ownerId === userId || perms.some((perm) => perm.userId === userId) || p.isPublic;
      })
      .map((p) => {
        const perms = this.permissions.get(p.projectId) || [];
        const userPerm = perms.find((perm) => perm.userId === userId);
        return {
          ...p,
          userRole: userPerm ? userPerm.role : 'VIEWER',
          userPermissions: userPerm ? userPerm.permissions : ['READ'],
        };
      });

    // Return an array of projects (tests expect array)
    return userProjects;
  }

  /**
   * Get audit log
   */
  getAuditLog(params) {
    const { projectId, limit = 50 } = params || {};

    let logs = this.auditLog;
    if (projectId) {
      logs = logs.filter((l) => l.projectId === projectId);
    }

    // Return array of entries (tests expect array)
    return logs.slice(-limit).reverse();
  }

  /**
   * Helper: Log audit event
   */
  _logAudit(event) {
    if (!this.options.auditLoggingEnabled) {
      return;
    }

    const logEntry = {
      ...event,
      performedBy: event.userId || event.performedBy || null,
      timestamp: Date.now(),
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.auditLog.push(logEntry);
    this.emit('audit:logged', logEntry);
  }

  /**
   * History management
   */
  getHistory(limit = 50) {
    return this.auditLog.slice(-limit);
  }

  clearHistory() {
    this.auditLog = [];
  }

  // Helper used by tests
  _getUserRoleForProject(userId, projectId) {
    const perms = this.permissions.get(projectId) || [];
    const p = perms.find((x) => x.userId === userId);
    return p ? p.role : null;
  }

  /**
   * Statistics
   */
  getStatistics() {
    if (this.projects.size === 0) {
      return { message: 'No projects available' };
    }

    const memberCounts = Array.from(this.projects.values()).map((p) => p.memberCount);
    const avgMembers = memberCounts.reduce((a, b) => a + b, 0) / memberCounts.length;

    // compute unique users across projects
    const allUsers = new Set();
    for (const perms of this.permissions.values()) {
      perms.forEach((p) => allUsers.add(p.userId));
    }

    return {
      totalProjects: this.projects.size,
      totalUsers: allUsers.size,
      totalMembers: memberCounts.reduce((a, b) => a + b, 0),
      averageMembersPerProject: parseFloat(avgMembers.toFixed(1)),
      maxMembersInProject: Math.max(...memberCounts),
      auditLogEntries: this.auditLog.length,
      timestamp: Date.now(),
    };
  }
}

export default ProjectSharingManager;

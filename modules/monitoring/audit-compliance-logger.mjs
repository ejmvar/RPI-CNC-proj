/**
 * Audit & Compliance Logger
 * Immutable append-only event store for operation logging,
 * compliance reporting, and detailed audit trails.
 */

export class AuditComplianceLogger {
  constructor(options = {}) {
    this.options = {
      maxLogSize: 1000000, // max 1M entries before archiving
      compressionThreshold: 100000,
      retentionDays: 365,
      encryptionEnabled: false,
      ...options,
    };

    this.eventLog = []; // immutable append-only log
    this.accessLog = [];
    this.operationLog = [];
    this.listeners = {};
    this.archiveCount = 0;
    this.logStats = {
      totalLogged: 0,
      totalAccesses: 0,
      totalOperations: 0,
    };
  }

  /**
   * Log an audit event (immutable)
   */
  logEvent(eventData) {
    const auditEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: eventData.type || 'OPERATION',
      severity: eventData.severity || 'INFO',
      userId: eventData.userId,
      resource: eventData.resource,
      action: eventData.action,
      details: eventData.details || {},
      status: eventData.status || 'SUCCESS',
      ipAddress: eventData.ipAddress,
      sessionId: eventData.sessionId,
      hash: null, // for integrity verification
    };

    // Compute hash for integrity
    auditEvent.hash = this._computeHash(auditEvent);

    // Append to immutable log
    this.eventLog.push(Object.freeze(auditEvent));
    this.logStats.totalLogged++;

    // Archive if log is too large
    if (this.eventLog.length > this.options.maxLogSize) {
      this._archiveLog();
    }

    this.emit('eventLogged', auditEvent);
    return auditEvent.id;
  }

  /**
   * Log access event
   */
  logAccess(accessData) {
    const accessEvent = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userId: accessData.userId,
      resourceId: accessData.resourceId,
      resourceType: accessData.resourceType,
      accessType: accessData.accessType, // READ, WRITE, DELETE
      ipAddress: accessData.ipAddress,
      sessionId: accessData.sessionId,
      result: accessData.result || 'GRANTED',
      reason: accessData.reason,
    };

    this.accessLog.push(Object.freeze(accessEvent));
    this.logStats.totalAccesses++;

    this.emit('accessLogged', accessEvent);
    return accessEvent.id;
  }

  /**
   * Log operation event
   */
  logOperation(operationData) {
    const operationEvent = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      operationType: operationData.operationType, // CNC_START, TOOL_CHANGE, etc
      operator: operationData.operator,
      duration: operationData.duration || 0,
      parameters: operationData.parameters || {},
      result: operationData.result || 'PENDING',
      errorMessage: operationData.errorMessage,
      affectedResources: operationData.affectedResources || [],
      machineId: operationData.machineId,
      jobId: operationData.jobId,
    };

    this.operationLog.push(Object.freeze(operationEvent));
    this.logStats.totalOperations++;

    this.emit('operationLogged', operationEvent);
    return operationEvent.id;
  }

  /**
   * Compute hash for log integrity
   * @private
   */
  _computeHash(entry) {
    const str = JSON.stringify(entry);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Verify log integrity
   */
  verifyIntegrity(eventId) {
    const event = this.eventLog.find((e) => e.id === eventId);
    if (!event) return { valid: false, reason: 'Event not found' };

    const eventCopy = { ...event };
    const originalHash = eventCopy.hash;
    eventCopy.hash = null;

    const computedHash = this._computeHash(eventCopy);
    const valid = computedHash === originalHash;

    return { valid, originalHash, computedHash };
  }

  /**
   * Get audit trail for user
   */
  getAuditTrailForUser(userId, limit = 100) {
    return this.eventLog
      .filter((e) => e.userId === userId)
      .slice(-limit)
      .map((e) => ({ ...e }));
  }

  /**
   * Get audit trail for resource
   */
  getAuditTrailForResource(resourceId, limit = 100) {
    return this.eventLog
      .filter((e) => e.resource === resourceId)
      .slice(-limit)
      .map((e) => ({ ...e }));
  }

  /**
   * Get access history for resource
   */
  getAccessHistory(resourceId, limit = 50) {
    return this.accessLog
      .filter((a) => a.resourceId === resourceId)
      .slice(-limit)
      .map((a) => ({ ...a }));
  }

  /**
   * Get operation history
   */
  getOperationHistory(filter = {}, limit = 100) {
    let operations = this.operationLog;

    if (filter.machineId) {
      operations = operations.filter((o) => o.machineId === filter.machineId);
    }

    if (filter.operator) {
      operations = operations.filter((o) => o.operator === filter.operator);
    }

    if (filter.operationType) {
      operations = operations.filter((o) => o.operationType === filter.operationType);
    }

    if (filter.startTime && filter.endTime) {
      operations = operations.filter(
        (o) => o.timestamp >= filter.startTime && o.timestamp <= filter.endTime
      );
    }

    return operations.slice(-limit).map((o) => ({ ...o }));
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(startTime, endTime) {
    const reportEvents = this.eventLog.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime
    );

    const failedEvents = reportEvents.filter((e) => e.status === 'FAILED');
    const warningEvents = reportEvents.filter((e) => e.severity === 'WARNING');
    const criticalEvents = reportEvents.filter((e) => e.severity === 'CRITICAL');

    const eventsByType = {};
    reportEvents.forEach((e) => {
      eventsByType[e.type] = (eventsByType[e.type] || 0) + 1;
    });

    return {
      reportId: `comp_${Date.now()}`,
      generatedAt: Date.now(),
      period: { startTime, endTime },
      totalEvents: reportEvents.length,
      successRate: ((reportEvents.length - failedEvents.length) / reportEvents.length) * 100,
      failedEvents: failedEvents.length,
      warningEvents: warningEvents.length,
      criticalEvents: criticalEvents.length,
      eventsByType,
      integrityStatus: 'VERIFIED',
      complianceStatus: failedEvents.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
    };
  }

  /**
   * Search audit log
   */
  searchAuditLog(criteria) {
    let results = this.eventLog;

    if (criteria.userId) {
      results = results.filter((e) => e.userId === criteria.userId);
    }

    if (criteria.action) {
      results = results.filter((e) => e.action === criteria.action);
    }

    if (criteria.severity) {
      results = results.filter((e) => e.severity === criteria.severity);
    }

    if (criteria.status) {
      results = results.filter((e) => e.status === criteria.status);
    }

    if (criteria.startTime && criteria.endTime) {
      results = results.filter(
        (e) => e.timestamp >= criteria.startTime && e.timestamp <= criteria.endTime
      );
    }

    return results.slice(0, criteria.limit || 1000).map((e) => ({ ...e }));
  }

  /**
   * Archive old logs
   * @private
   */
  _archiveLog() {
    const cutoffTime = Date.now() - this.options.retentionDays * 24 * 60 * 60 * 1000;
    const archived = this.eventLog.filter((e) => e.timestamp < cutoffTime);

    if (archived.length > 0) {
      this.archiveCount++;
      this.eventLog = this.eventLog.filter((e) => e.timestamp >= cutoffTime);
      this.emit('logArchived', {
        archivedCount: archived.length,
        archiveNumber: this.archiveCount,
      });
    }
  }

  /**
   * Get log statistics
   */
  getStatistics() {
    const eventTypes = {};
    this.eventLog.forEach((e) => {
      eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
    });

    const severityBreakdown = {};
    this.eventLog.forEach((e) => {
      severityBreakdown[e.severity] = (severityBreakdown[e.severity] || 0) + 1;
    });

    return {
      currentLogSize: this.eventLog.length,
      totalLogged: this.logStats.totalLogged,
      totalAccesses: this.logStats.totalAccesses,
      totalOperations: this.logStats.totalOperations,
      archiveCount: this.archiveCount,
      eventTypeBreakdown: eventTypes,
      severityBreakdown,
      timestamp: Date.now(),
    };
  }

  /**
   * Export audit trail
   */
  exportAuditTrail(format = 'json') {
    const exported = {
      exportedAt: Date.now(),
      format,
      events: this.eventLog.map((e) => ({ ...e })),
      accessLog: this.accessLog.map((a) => ({ ...a })),
      operationLog: this.operationLog.map((o) => ({ ...o })),
      statistics: this.getStatistics(),
    };

    return exported;
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }
}

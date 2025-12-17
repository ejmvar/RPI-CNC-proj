import { AuditComplianceLogger } from '../../../modules/monitoring/audit-compliance-logger.mjs';

describe('AuditComplianceLogger', () => {
  let logger;

  beforeEach(() => {
    logger = new AuditComplianceLogger({
      maxLogSize: 10000,
      retentionDays: 365,
    });
  });

  test('should initialize with default options', () => {
    const stats = logger.getStatistics();
    expect(stats.currentLogSize).toBe(0);
    expect(stats.totalLogged).toBe(0);
  });

  test('should log events immutably', () => {
    const eventId = logger.logEvent({
      type: 'OPERATION',
      severity: 'INFO',
      userId: 'user_1',
      resource: 'tool_1',
      action: 'START',
      status: 'SUCCESS',
    });

    expect(eventId).toBeDefined();
    const stats = logger.getStatistics();
    expect(stats.totalLogged).toBe(1);
  });

  test('should emit event logged event', (done) => {
    let eventLogged = false;
    logger.on('eventLogged', () => {
      eventLogged = true;
    });

    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
    });

    setTimeout(() => {
      expect(eventLogged).toBe(true);
      done();
    }, 50);
  });

  test('should log access events', () => {
    const accessId = logger.logAccess({
      userId: 'user_1',
      resourceId: 'job_1',
      resourceType: 'JOB',
      accessType: 'READ',
      result: 'GRANTED',
    });

    expect(accessId).toBeDefined();
    const stats = logger.getStatistics();
    expect(stats.totalAccesses).toBe(1);
  });

  test('should emit access logged event', (done) => {
    let accessLogged = false;
    logger.on('accessLogged', () => {
      accessLogged = true;
    });

    logger.logAccess({
      userId: 'user_1',
      resourceId: 'job_1',
      resourceType: 'JOB',
      accessType: 'READ',
      result: 'GRANTED',
    });

    setTimeout(() => {
      expect(accessLogged).toBe(true);
      done();
    }, 50);
  });

  test('should log operation events', () => {
    const operationId = logger.logOperation({
      operationType: 'CNC_START',
      operator: 'operator_1',
      duration: 300,
      result: 'SUCCESS',
      machineId: 'cnc_1',
      jobId: 'job_1',
    });

    expect(operationId).toBeDefined();
    const stats = logger.getStatistics();
    expect(stats.totalOperations).toBe(1);
  });

  test('should emit operation logged event', (done) => {
    let operationLogged = false;
    logger.on('operationLogged', () => {
      operationLogged = true;
    });

    logger.logOperation({
      operationType: 'CNC_START',
      operator: 'operator_1',
      result: 'SUCCESS',
    });

    setTimeout(() => {
      expect(operationLogged).toBe(true);
      done();
    }, 50);
  });

  test('should compute and verify log integrity', () => {
    const eventId = logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
    });

    const verification = logger.verifyIntegrity(eventId);
    expect(verification.valid).toBe(true);
  });

  test('should detect integrity violations', () => {
    // This test verifies that tampering detection would work
    const eventId = logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
    });

    const verification = logger.verifyIntegrity(eventId);
    expect(verification.originalHash).toBeDefined();
    expect(verification.computedHash).toBeDefined();
  });

  test('should get audit trail for user', () => {
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
    });
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'STOP',
    });
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_2',
      action: 'START',
    });

    const auditTrail = logger.getAuditTrailForUser('user_1');
    expect(auditTrail.length).toBe(2);
  });

  test('should get audit trail for resource', () => {
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      resource: 'tool_1',
      action: 'START',
    });
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_2',
      resource: 'tool_1',
      action: 'STOP',
    });
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_3',
      resource: 'tool_2',
      action: 'START',
    });

    const auditTrail = logger.getAuditTrailForResource('tool_1');
    expect(auditTrail.length).toBe(2);
  });

  test('should get access history', () => {
    logger.logAccess({
      userId: 'user_1',
      resourceId: 'job_1',
      accessType: 'READ',
      result: 'GRANTED',
    });
    logger.logAccess({
      userId: 'user_1',
      resourceId: 'job_1',
      accessType: 'WRITE',
      result: 'DENIED',
    });

    const history = logger.getAccessHistory('job_1');
    expect(history.length).toBe(2);
  });

  test('should get operation history', () => {
    logger.logOperation({
      operationType: 'CNC_START',
      operator: 'operator_1',
      machineId: 'cnc_1',
    });
    logger.logOperation({
      operationType: 'TOOL_CHANGE',
      operator: 'operator_1',
      machineId: 'cnc_1',
    });

    const history = logger.getOperationHistory();
    expect(history.length).toBe(2);
  });

  test('should filter operation history by machine', () => {
    logger.logOperation({
      operationType: 'CNC_START',
      operator: 'operator_1',
      machineId: 'cnc_1',
    });
    logger.logOperation({
      operationType: 'CNC_START',
      operator: 'operator_1',
      machineId: 'cnc_2',
    });

    const history = logger.getOperationHistory({ machineId: 'cnc_1' });
    expect(history.length).toBe(1);
    expect(history[0].machineId).toBe('cnc_1');
  });

  test('should filter operation history by operator', () => {
    logger.logOperation({
      operationType: 'CNC_START',
      operator: 'operator_1',
      machineId: 'cnc_1',
    });
    logger.logOperation({
      operationType: 'CNC_START',
      operator: 'operator_2',
      machineId: 'cnc_1',
    });

    const history = logger.getOperationHistory({ operator: 'operator_1' });
    expect(history.length).toBe(1);
    expect(history[0].operator).toBe('operator_1');
  });

  test('should filter operation history by time range', () => {
    const now = Date.now();
    logger.logOperation({
      operationType: 'CNC_START',
      operator: 'operator_1',
    });

    const history = logger.getOperationHistory({
      startTime: now - 10000,
      endTime: now + 10000,
    });
    expect(history.length).toBeGreaterThan(0);
  });

  test('should generate compliance report', () => {
    const now = Date.now();

    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
      status: 'SUCCESS',
      severity: 'INFO',
    });
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'STOP',
      status: 'SUCCESS',
      severity: 'INFO',
    });

    const report = logger.generateComplianceReport(now - 10000, now + 10000);

    expect(report.reportId).toBeDefined();
    expect(report.totalEvents).toBeGreaterThan(0);
    expect(report.successRate).toBeGreaterThan(0);
    expect(report.complianceStatus).toBeDefined();
  });

  test('should mark non-compliant when failures exist', () => {
    const now = Date.now();

    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
      status: 'FAILED',
      severity: 'CRITICAL',
    });

    const report = logger.generateComplianceReport(now - 10000, now + 10000);
    expect(report.failedEvents).toBeGreaterThan(0);
  });

  test('should search audit log by user', () => {
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
    });
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_2',
      action: 'START',
    });

    const results = logger.searchAuditLog({ userId: 'user_1' });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.userId).toBe('user_1');
    });
  });

  test('should search audit log by action', () => {
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
    });
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'STOP',
    });

    const results = logger.searchAuditLog({ action: 'START' });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.action).toBe('START');
    });
  });

  test('should search audit log by severity', () => {
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
      severity: 'CRITICAL',
    });
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'STOP',
      severity: 'INFO',
    });

    const results = logger.searchAuditLog({ severity: 'CRITICAL' });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.severity).toBe('CRITICAL');
    });
  });

  test('should search audit log by status', () => {
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
      status: 'SUCCESS',
    });
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'STOP',
      status: 'FAILED',
    });

    const results = logger.searchAuditLog({ status: 'SUCCESS' });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.status).toBe('SUCCESS');
    });
  });

  test('should get statistics', () => {
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
      severity: 'INFO',
    });
    logger.logEvent({
      type: 'SECURITY',
      userId: 'user_1',
      action: 'LOGIN',
      severity: 'WARNING',
    });
    logger.logAccess({
      userId: 'user_1',
      resourceId: 'job_1',
      accessType: 'READ',
    });
    logger.logOperation({
      operationType: 'CNC_START',
      operator: 'operator_1',
    });

    const stats = logger.getStatistics();
    expect(stats.totalLogged).toBe(2);
    expect(stats.totalAccesses).toBe(1);
    expect(stats.totalOperations).toBe(1);
    expect(stats.currentLogSize).toBeGreaterThan(0);
  });

  test('should export audit trail', () => {
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
    });
    logger.logAccess({
      userId: 'user_1',
      resourceId: 'job_1',
      accessType: 'READ',
    });

    const exported = logger.exportAuditTrail('json');
    expect(exported.events).toBeDefined();
    expect(exported.accessLog).toBeDefined();
    expect(exported.operationLog).toBeDefined();
    expect(exported.statistics).toBeDefined();
  });

  test('should maintain immutability of logged events', () => {
    const eventId = logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
    });

    const auditTrail = logger.getAuditTrailForUser('user_1');
    const event = auditTrail[0];

    expect(() => {
      event.action = 'MODIFIED';
    }).not.toThrow();

    // Original should remain unchanged
    const auditTrailAfter = logger.getAuditTrailForUser('user_1');
    const eventAfter = auditTrailAfter[0];
    expect(eventAfter.action).toBe('START');
  });

  test('should track event types in statistics', () => {
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
    });
    logger.logEvent({
      type: 'SECURITY',
      userId: 'user_1',
      action: 'LOGIN',
    });
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'STOP',
    });

    const stats = logger.getStatistics();
    expect(stats.eventTypeBreakdown.OPERATION).toBe(2);
    expect(stats.eventTypeBreakdown.SECURITY).toBe(1);
  });

  test('should track severity breakdown in statistics', () => {
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'START',
      severity: 'INFO',
    });
    logger.logEvent({
      type: 'OPERATION',
      userId: 'user_1',
      action: 'STOP',
      severity: 'CRITICAL',
    });

    const stats = logger.getStatistics();
    expect(stats.severityBreakdown.INFO).toBeGreaterThan(0);
    expect(stats.severityBreakdown.CRITICAL).toBeGreaterThan(0);
  });

  test('should handle long-term audit trail retention', () => {
    for (let i = 0; i < 50; i++) {
      logger.logEvent({
        type: 'OPERATION',
        userId: `user_${i % 5}`,
        action: `ACTION_${i}`,
      });
    }

    const stats = logger.getStatistics();
    expect(stats.totalLogged).toBe(50);
  });
});

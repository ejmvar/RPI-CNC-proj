/**
 * Hardware Integration Tests
 * Phase 15.4: Hardware Integration
 */

/* eslint-disable no-undef */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { WebSerialAPI } from '../../../modules/hardware/webserial-api.mjs';
import { PositionFeedback } from '../../../modules/hardware/position-feedback.mjs';
import { JogControls } from '../../../modules/hardware/jog-controls.mjs';
import { MachineProfiles } from '../../../modules/hardware/machine-profiles.mjs';

describe('WebSerialAPI', () => {
  let api;

  beforeEach(() => {
    api = new WebSerialAPI({ baudRate: 115200 });
  });

  test('should create WebSerial API', () => {
    expect(api).toBeDefined();
    expect(api.options.baudRate).toBe(115200);
    expect(api.isConnected).toBe(false);
  });

  test('should check WebSerial support', () => {
    const supported = WebSerialAPI.isSupported();
    expect(typeof supported).toBe('boolean');
  });

  test('should emit events', (done) => {
    api.on('test-event', (data) => {
      expect(data.message).toBe('hello');
      done();
    });

    api.emit('test-event', { message: 'hello' });
  });

  test('should parse status report', () => {
    const report = '<Idle|MPos:10.5,20.3,5.0|WPos:10.5,20.3,5.0>';
    const parsed = api.parseStatusReport(report);

    expect(parsed.state).toBe('Idle');
    expect(parsed.mPos.x).toBe(10.5);
    expect(parsed.mPos.y).toBe(20.3);
    expect(parsed.mPos.z).toBe(5.0);
  });

  test('should get port information', () => {
    const info = api.getPortInfo(9025, 'manufacturer');
    expect(typeof info).toBe('string');
  });

  test('should get connection status', () => {
    const status = api.getStatus();
    expect(status.connected).toBe(false);
    expect(status.baudRate).toBe(115200);
  });

  test('should handle data parsing', () => {
    let receivedOk = false;
    api.on('ok', () => {
      receivedOk = true;
    });

    api.handleData('ok\n');
    expect(receivedOk).toBe(true);
  });

  test('should handle error messages', () => {
    let receivedError = false;
    api.on('error', () => {
      receivedError = true;
    });

    api.handleData('error: Invalid command\n');
    expect(receivedError).toBe(true);
  });

  test('should handle data events', () => {
    let dataReceived = false;
    api.on('data', () => {
      dataReceived = true;
    });

    api.handleData('some output\n');
    expect(dataReceived).toBe(true);
  });
});

describe('PositionFeedback', () => {
  let feedback;

  beforeEach(() => {
    feedback = new PositionFeedback({ historySize: 100 });
  });

  test('should create position feedback', () => {
    expect(feedback).toBeDefined();
    expect(feedback.currentPosition).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('should update position from status report', () => {
    const report = { mPos: { x: 10, y: 20, z: 5 }, wPos: { x: 10, y: 20, z: 5 } };
    const position = feedback.updatePosition(report);

    expect(position.x).toBe(10);
    expect(position.y).toBe(20);
    expect(position.z).toBe(5);
  });

  test('should set coordinate offset', () => {
    const offset = feedback.setOffset(1, 2, 3);
    expect(offset.x).toBe(1);
    expect(offset.y).toBe(2);
    expect(offset.z).toBe(3);
  });

  test('should get current position', () => {
    feedback.updatePosition({ mPos: { x: 5, y: 10, z: 2 }, wPos: { x: 5, y: 10, z: 2 } });
    const pos = feedback.getPosition();

    expect(pos.work).toEqual({ x: 5, y: 10, z: 2 });
    expect(pos.machine).toEqual({ x: 5, y: 10, z: 2 });
  });

  test('should calculate delta', () => {
    const delta = feedback.calculateDelta({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
    expect(delta.x).toBe(3);
    expect(delta.y).toBe(4);
    expect(delta.distance).toBe(5); // 3-4-5 triangle
  });

  test('should record position history', () => {
    feedback.updatePosition({ mPos: { x: 1, y: 1, z: 0 }, wPos: { x: 1, y: 1, z: 0 } });
    feedback.updatePosition({ mPos: { x: 2, y: 2, z: 0 }, wPos: { x: 2, y: 2, z: 0 } });

    const history = feedback.getHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  test('should clear history', () => {
    feedback.updatePosition({ mPos: { x: 1, y: 1, z: 0 }, wPos: { x: 1, y: 1, z: 0 } });
    const result = feedback.clearHistory();

    expect(result.cleared).toBe(true);
    expect(feedback.getHistory().length).toBe(0);
  });

  test('should get statistics', () => {
    feedback.updatePosition({ mPos: { x: 0, y: 0, z: 0 }, wPos: { x: 0, y: 0, z: 0 } });
    feedback.updatePosition({ mPos: { x: 10, y: 10, z: 5 }, wPos: { x: 10, y: 10, z: 5 } });

    const stats = feedback.getStats();
    expect(stats.positions).toBe(2);
    expect(stats.maxX).toBe(10);
    expect(stats.maxY).toBe(10);
    expect(stats.maxZ).toBe(5);
  });

  test('should reset position', () => {
    feedback.updatePosition({ mPos: { x: 100, y: 100, z: 50 }, wPos: { x: 100, y: 100, z: 50 } });
    feedback.reset();

    const pos = feedback.getPosition();
    expect(pos.work).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('JogControls', () => {
  let jog;

  beforeEach(() => {
    jog = new JogControls({ normalFeed: 100, rapidFeed: 500 });
  });

  test('should create jog controls', () => {
    expect(jog).toBeDefined();
    expect(jog.isJogging).toBe(false);
  });

  test('should perform single jog', () => {
    const result = jog.jog('X', 1, 10, 200);
    expect(result.command).toBeDefined();
    expect(result.distance).toBe(10);
  });

  test('should perform rapid jog', () => {
    const result = jog.rapidJog('Z', -1);
    expect(result.feedRate).toBe(500);
  });

  test('should set jog increment', () => {
    const result = jog.setIncrement(5.0);
    expect(result.current).toBe(5.0);
    expect(jog.options.currentIncrement).toBe(5.0);
  });

  test('should get available increments', () => {
    const increments = jog.getIncrements();
    expect(Array.isArray(increments)).toBe(true);
    expect(increments.length).toBeGreaterThan(0);
  });

  test('should set feed rate', () => {
    const result = jog.setFeedRate(250);
    expect(result.feedRate).toBe(250);
    expect(jog.currentFeed).toBe(250);
  });

  test('should start continuous jog', () => {
    const result = jog.startContinuousJog('Y', 1, 150);
    expect(result.jogging).toBe(true);
    expect(jog.isJogging).toBe(true);
  });

  test('should stop continuous jog', () => {
    jog.startContinuousJog('X', 1);
    const result = jog.stopContinuousJog();
    expect(result.jogging).toBe(false);
  });

  test('should get jog status', () => {
    const status = jog.getStatus();
    expect(status.jogging).toBe(false);
    expect(status.feedRate).toBe(100);
  });

  test('should emit jog events', (done) => {
    jog.on('jog:initiated', (cmd) => {
      expect(cmd.axis).toBe('X');
      done();
    });

    jog.jog('X', 1, 5);
  });

  test('should handle keyboard controls', () => {
    const result = jog.setupKeyboardControls();
    expect(result.success).toBeDefined();
  });
});

describe('MachineProfiles', () => {
  let profiles;

  beforeEach(() => {
    profiles = new MachineProfiles();
  });

  test('should create machine profiles', () => {
    expect(profiles).toBeDefined();
    expect(profiles.profiles.size).toBeGreaterThan(0);
  });

  test('should have default profile', () => {
    const defaultProf = profiles.getProfile('default');
    expect(defaultProf).toBeDefined();
    expect(defaultProf.name).toBe('Default CNC');
  });

  test('should create new profile', () => {
    const prof = profiles.createProfile('Test Machine', {
      type: 'laser',
      workAreaX: 800,
      workAreaY: 600,
    });

    expect(prof.id).toBeDefined();
    expect(prof.name).toBe('Test Machine');
    expect(prof.specs.workAreaX).toBe(800);
  });

  test('should get profile by ID', () => {
    const prof = profiles.createProfile('Machine 1');
    const retrieved = profiles.getProfile(prof.id);

    expect(retrieved.id).toBe(prof.id);
    expect(retrieved.name).toBe('Machine 1');
  });

  test('should update profile', () => {
    const prof = profiles.createProfile('Update Test');
    const updated = profiles.updateProfile(prof.id, { description: 'Updated description' });

    expect(updated.description).toBe('Updated description');
  });

  test('should list profiles', () => {
    profiles.createProfile('Prof 1');
    profiles.createProfile('Prof 2');
    const list = profiles.listProfiles();

    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test('should set active profile', () => {
    const prof = profiles.createProfile('Active Test');
    profiles.setActiveProfile(prof.id);

    expect(profiles.activeProfile).toBe(prof.id);
  });

  test('should get active profile', () => {
    const active = profiles.getActiveProfile();
    expect(active).toBeDefined();
  });

  test('should add tool offset', () => {
    const prof = profiles.getProfile('default');
    const tool = { id: '1', name: 'Tool 1', offsetZ: 25.4 };
    const offset = profiles.addToolOffset(prof.id, tool);

    expect(offset.toolId).toBe('1');
    expect(offset.offsetZ).toBe(25.4);
  });

  test('should remove tool offset', () => {
    const prof = profiles.getProfile('default');
    const tool = { id: '2', name: 'Tool 2' };
    profiles.addToolOffset(prof.id, tool);
    const result = profiles.removeToolOffset(prof.id, '2');

    expect(result.removed).toBe(true);
  });

  test('should get tool offset', () => {
    const prof = profiles.getProfile('default');
    const tool = { id: '3', name: 'Tool 3', diameter: 3.175 };
    profiles.addToolOffset(prof.id, tool);
    const offset = profiles.getToolOffset(prof.id, '3');

    expect(offset.toolId).toBe('3');
    expect(offset.diameter).toBe(3.175);
  });

  test('should validate bounds', () => {
    const prof = profiles.getProfile('default');
    const result = profiles.validateBounds(prof.id, { x: 100, y: 100, z: 50 });

    expect(result.valid).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  test('should detect out-of-bounds position', () => {
    const prof = profiles.getProfile('default');
    const result = profiles.validateBounds(prof.id, { x: 10000, y: 10000, z: 10000 });

    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  test('should export profile', () => {
    const prof = profiles.getProfile('default');
    const json = profiles.exportProfile(prof.id);

    expect(typeof json).toBe('string');
    expect(json.includes('Default CNC')).toBe(true);
  });

  test('should import profile', () => {
    const prof = profiles.getProfile('default');
    const json = profiles.exportProfile(prof.id);
    const imported = profiles.importProfile(json);

    expect(imported).toBeDefined();
    expect(imported.name).toBe('Default CNC');
  });

  test('should get profile statistics', () => {
    profiles.createProfile('Stat Test 1');
    profiles.createProfile('Stat Test 2');
    const stats = profiles.getStats();

    expect(stats.totalProfiles).toBeGreaterThan(0);
    expect(Array.isArray(stats.profiles)).toBe(true);
  });

  test('should emit profile events', (done) => {
    profiles.on('profile:created', (data) => {
      expect(data.name).toBe('Event Test');
      done();
    });

    profiles.createProfile('Event Test');
  });

  test('should delete profile', () => {
    const prof = profiles.createProfile('To Delete');
    const result = profiles.deleteProfile(prof.id);

    expect(result.deleted).toBe(true);
  });
});

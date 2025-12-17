import { HardwareDeviceManager } from '../../../modules/hardware/device-manager.mjs';

describe('HardwareDeviceManager', () => {
  let manager;

  beforeEach(() => {
    manager = new HardwareDeviceManager();
  });

  // ===== Device Registration Tests =====
  describe('Device Registration', () => {
    test('should register a device', () => {
      const result = manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
        port: '/dev/ttyUSB0',
        name: 'GRBL CNC-1',
      });
      expect(result).toBe(true);
      expect(manager.devices.size).toBe(1);
    });

    test('should throw on invalid registration', () => {
      expect(() => manager.registerDevice({})).toThrow();
    });

    test('should throw on duplicate device', () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
      expect(() =>
        manager.registerDevice({
          id: 'device-001',
          type: 'GRBL',
        })
      ).toThrow();
    });

    test('should throw on unknown protocol', () => {
      expect(() =>
        manager.registerDevice({
          id: 'device-001',
          type: 'UNKNOWN_PROTOCOL',
        })
      ).toThrow();
    });

    test('should support multiple device types', () => {
      manager.registerDevice({
        id: 'grbl-1',
        type: 'GRBL',
      });
      manager.registerDevice({
        id: 'linuxcnc-1',
        type: 'LINUXCNC',
      });
      manager.registerDevice({
        id: 'mach3-1',
        type: 'MACH3',
      });

      expect(manager.devices.size).toBe(3);
    });

    test('should emit device registered event', (done) => {
      manager.on('deviceRegistered', (data) => {
        expect(data.deviceId).toBe('device-001');
        expect(data.type).toBe('GRBL');
        done();
      });
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
    });
  });

  // ===== Device Discovery Tests =====
  describe('Device Discovery', () => {
    test('should discover devices', () => {
      const devices = manager.discoverDevices();
      expect(devices.length).toBeGreaterThan(0);
    });

    test('should emit devices discovered event', (done) => {
      manager.on('devicesDiscovered', (data) => {
        expect(data.count).toBeGreaterThan(0);
        expect(data.devices).toBeDefined();
        done();
      });
      manager.discoverDevices();
    });

    test('should auto-register discovered devices', () => {
      const initialCount = manager.devices.size;
      manager.discoverDevices();
      expect(manager.devices.size).toBeGreaterThanOrEqual(initialCount);
    });
  });

  // ===== Connection Tests =====
  describe('Device Connection', () => {
    beforeEach(() => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
    });

    test('should connect to device', async () => {
      const result = await manager.connectDevice('device-001');
      expect(result).toBe(true);
    });

    test('should throw on connecting non-existent device', async () => {
      await expect(manager.connectDevice('non-existent')).rejects.toThrow();
    });

    test('should emit device connected event', (done) => {
      manager.on('deviceConnected', (data) => {
        expect(data.deviceId).toBe('device-001');
        done();
      });
      manager.connectDevice('device-001');
    });

    test('should set device state to connected', async () => {
      await manager.connectDevice('device-001');
      const state = manager.getDeviceState('device-001');
      expect(state.state).toBe('connected');
      expect(state.connected).toBe(true);
    });

    test('should not reconnect already connected device', async () => {
      await manager.connectDevice('device-001');
      const result = await manager.connectDevice('device-001');
      expect(result).toBe(true);
    });
  });

  // ===== Disconnection Tests =====
  describe('Device Disconnection', () => {
    beforeEach(async () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
      await manager.connectDevice('device-001');
    });

    test('should disconnect from device', async () => {
      const result = await manager.disconnectDevice('device-001');
      expect(result).toBe(true);
    });

    test('should emit device disconnected event', (done) => {
      manager.on('deviceDisconnected', (data) => {
        expect(data.deviceId).toBe('device-001');
        done();
      });
      manager.disconnectDevice('device-001');
    });

    test('should set device state to disconnected', async () => {
      await manager.disconnectDevice('device-001');
      const state = manager.getDeviceState('device-001');
      expect(state.state).toBe('disconnected');
      expect(state.connected).toBe(false);
    });
  });

  // ===== Command Execution Tests =====
  describe('Command Execution', () => {
    beforeEach(async () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
      await manager.connectDevice('device-001');
    });

    test('should send command to device', async () => {
      const result = await manager.sendCommand('device-001', 'G0', ['X10', 'Y20']);
      expect(result.status).toBe('ok');
      expect(result.command).toBe('G0');
    });

    test('should throw on command to disconnected device', async () => {
      manager.registerDevice({
        id: 'device-002',
        type: 'GRBL',
      });

      await expect(manager.sendCommand('device-002', 'G0')).rejects.toThrow();
    });

    test('should emit command executed event', (done) => {
      manager.on('commandExecuted', (data) => {
        expect(data.deviceId).toBe('device-001');
        expect(data.command).toBe('G0');
        done();
      });
      manager.sendCommand('device-001', 'G0');
    });

    test('should increment message count', async () => {
      await manager.sendCommand('device-001', 'G0');
      const metrics = manager.getDeviceMetrics('device-001');
      expect(metrics.messagesSent).toBeGreaterThan(0);
      expect(metrics.messagesReceived).toBeGreaterThan(0);
    });
  });

  // ===== Device State Tests =====
  describe('Device State', () => {
    beforeEach(async () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
      await manager.connectDevice('device-001');
    });

    test('should get device state', () => {
      const state = manager.getDeviceState('device-001');
      expect(state.id).toBe('device-001');
      expect(state.type).toBe('GRBL');
      expect(state.state).toBe('connected');
    });

    test('should throw on non-existent device state', () => {
      expect(() => manager.getDeviceState('non-existent')).toThrow();
    });

    test('should include uptime in state', () => {
      const state = manager.getDeviceState('device-001');
      expect(state.uptime).toBeDefined();
      expect(state.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should include metrics in state', () => {
      const state = manager.getDeviceState('device-001');
      expect(state.metrics).toBeDefined();
      expect(state.metrics.connected).toBe(true);
    });
  });

  // ===== Device List Tests =====
  describe('Get Devices', () => {
    test('should return all devices', () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
      manager.registerDevice({
        id: 'device-002',
        type: 'LINUXCNC',
      });

      const devices = manager.getDevices();
      expect(devices.length).toBe(2);
      expect(devices[0].id).toBe('device-001');
      expect(devices[1].id).toBe('device-002');
    });

    test('should include device connection status', async () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
      await manager.connectDevice('device-001');

      const devices = manager.getDevices();
      const device = devices.find((d) => d.id === 'device-001');
      expect(device.connected).toBe(true);
    });
  });

  // ===== Device Metrics Tests =====
  describe('Device Metrics', () => {
    beforeEach(async () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
      await manager.connectDevice('device-001');
      await manager.sendCommand('device-001', 'G0');
    });

    test('should get device metrics', () => {
      const metrics = manager.getDeviceMetrics('device-001');
      expect(metrics.deviceId).toBe('device-001');
      expect(metrics.messagesReceived).toBeGreaterThan(0);
    });

    test('should throw on non-existent device metrics', () => {
      expect(() => manager.getDeviceMetrics('non-existent')).toThrow();
    });

    test('should track connection attempts', () => {
      manager.registerDevice({
        id: 'device-002',
        type: 'GRBL',
      });

      const metrics = manager.getDeviceMetrics('device-002');
      expect(metrics.connectionAttempts).toBe(0);
    });
  });

  // ===== Manager Statistics Tests =====
  describe('Manager Statistics', () => {
    test('should provide statistics', () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });

      const stats = manager.getStatistics();
      expect(stats.totalDevices).toBe(1);
      expect(stats.connectedDevices).toBe(0);
      expect(stats.timestamp).toBeDefined();
    });

    test('should track connected devices in statistics', async () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
      await manager.connectDevice('device-001');

      const stats = manager.getStatistics();
      expect(stats.connectedDevices).toBe(1);
    });

    test('should track discovery stats', () => {
      manager.discoverDevices();
      const stats = manager.getStatistics();
      expect(stats.devicesDiscovered).toBeGreaterThan(0);
    });
  });

  // ===== Adapter Tests =====
  describe('Protocol Adapters', () => {
    test('should have GRBL adapter', () => {
      const adapter = manager.adapters.get('GRBL');
      expect(adapter).toBeDefined();
      expect(adapter.protocol).toBe('GRBL');
    });

    test('should have LinuxCNC adapter', () => {
      const adapter = manager.adapters.get('LINUXCNC');
      expect(adapter).toBeDefined();
      expect(adapter.protocol).toBe('LinuxCNC');
    });

    test('should have Mach3 adapter', () => {
      const adapter = manager.adapters.get('MACH3');
      expect(adapter).toBeDefined();
      expect(adapter.protocol).toBe('Mach3');
    });

    test('adapters should have commands', () => {
      const adapter = manager.adapters.get('GRBL');
      expect(adapter.commands).toBeDefined();
      expect(adapter.commands.status).toBeDefined();
    });
  });

  // ===== Device Limit Tests =====
  describe('Device Limits', () => {
    test('should enforce max device limit', () => {
      const limited = new HardwareDeviceManager({
        maxDevices: 2,
      });

      limited.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
      limited.registerDevice({
        id: 'device-002',
        type: 'GRBL',
      });

      expect(() =>
        limited.registerDevice({
          id: 'device-003',
          type: 'GRBL',
        })
      ).toThrow();
    });
  });

  // ===== Connection Error Handling =====
  describe('Connection Error Handling', () => {
    test('should handle connection errors gracefully', () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });

      let errorEmitted = false;
      manager.on('connectionError', () => {
        errorEmitted = true;
      });

      manager.connectDevice('device-001');

      // Connection will eventually either succeed or emit error
      setTimeout(() => {
        // Check if error was emitted or device is connected
        const state = manager.getDeviceState('device-001');
        expect(errorEmitted || state.state === 'connected').toBe(true);
      }, 500);
    });
  });

  // ===== Multiple Device Management =====
  describe('Multiple Device Management', () => {
    test('should manage multiple devices independently', async () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
      manager.registerDevice({
        id: 'device-002',
        type: 'LINUXCNC',
      });

      await manager.connectDevice('device-001');
      const state1 = manager.getDeviceState('device-001');
      const state2 = manager.getDeviceState('device-002');

      expect(state1.connected).toBe(true);
      expect(state2.connected).toBe(false);
    });

    test('should send commands to specific devices', async () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
      });
      manager.registerDevice({
        id: 'device-002',
        type: 'GRBL',
      });

      await manager.connectDevice('device-001');
      await manager.connectDevice('device-002');

      await manager.sendCommand('device-001', 'G0');
      await manager.sendCommand('device-002', 'G1');

      const metrics1 = manager.getDeviceMetrics('device-001');
      const metrics2 = manager.getDeviceMetrics('device-002');

      expect(metrics1.messagesSent).toBeGreaterThan(0);
      expect(metrics2.messagesSent).toBeGreaterThan(0);
    });
  });

  // ===== Event Emission Tests =====
  describe('Event Emission', () => {
    test('should have event listener capability', () => {
      let eventFired = false;
      manager.on('testEvent', () => {
        eventFired = true;
      });
      manager.emit('testEvent', {});
      expect(eventFired).toBe(true);
    });

    test('should emit events with data', (done) => {
      manager.on('customEvent', (data) => {
        expect(data.value).toBe(42);
        done();
      });
      manager.emit('customEvent', { value: 42 });
    });
  });

  // ===== Device Configuration Tests =====
  describe('Device Configuration', () => {
    test('should store device configuration', () => {
      const config = {
        baudRate: 57600,
        timeout: 5000,
      };
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
        config,
      });

      const device = manager.devices.get('device-001');
      expect(device.config).toEqual(config);
    });

    test('should store device description', () => {
      manager.registerDevice({
        id: 'device-001',
        type: 'GRBL',
        description: '3-axis milling machine',
      });

      const device = manager.devices.get('device-001');
      expect(device.description).toBe('3-axis milling machine');
    });
  });
});

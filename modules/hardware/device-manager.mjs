/**
 * Hardware Device Manager Module
 *
 * Manages device discovery, connection lifecycle, protocol adapters,
 * and device state tracking for CNC hardware integration.
 */

export class HardwareDeviceManager {
  constructor(options = {}) {
    this.options = {
      maxDevices: options.maxDevices || 20,
      reconnectAttempts: options.reconnectAttempts || 5,
      reconnectDelay: options.reconnectDelay || 2000,
      healthCheckInterval: options.healthCheckInterval || 5000,
      ...options,
    };

    this.devices = new Map();
    this.adapters = new Map();
    this.connections = new Map();
    this.listeners = {};
    this.stats = {
      devicesDiscovered: 0,
      devicesConnected: 0,
      connectionErrors: 0,
      reconnectAttempts: 0,
    };

    this._initDefaultAdapters();
  }

  /**
   * Initialize default protocol adapters
   * @private
   */
  _initDefaultAdapters() {
    // GRBL adapter
    this.adapters.set('GRBL', {
      protocol: 'GRBL',
      name: 'GRBL CNC Controller',
      baudRate: 115200,
      parser: (data) => {
        const lines = data.toString().split('\n');
        return lines.map((line) => ({
          type: this._parseGRBLResponse(line),
          content: line.trim(),
        }));
      },
      commands: {
        status: '$G',
        reset: '^x',
        unlock: '$X',
        home: '$H',
      },
    });

    // LinuxCNC adapter
    this.adapters.set('LINUXCNC', {
      protocol: 'LinuxCNC',
      name: 'LinuxCNC Interface',
      socketPort: 5005,
      parser: (data) => {
        return data; // LinuxCNC uses different protocol
      },
      commands: {
        status: 'GET_STATUS',
        reset: 'RESET',
        home: 'HOME',
      },
    });

    // Mach3 adapter
    this.adapters.set('MACH3', {
      protocol: 'Mach3',
      name: 'Mach3 Controller',
      socketPort: 6789,
      parser: (data) => {
        return JSON.parse(data);
      },
      commands: {
        status: 'STATUS',
        reset: 'RESET',
        home: 'HOME_ALL',
      },
    });
  }

  /**
   * Parse GRBL response
   * @private
   */
  _parseGRBLResponse(line) {
    if (line.startsWith('<') && line.endsWith('>')) return 'status';
    if (line.startsWith('ok')) return 'ok';
    if (line.startsWith('error')) return 'error';
    if (line.startsWith('Alarm')) return 'alarm';
    return 'unknown';
  }

  /**
   * Discover and enumerate connected devices
   * @param {array} portPatterns - Optional port patterns (e.g., ['/dev/ttyUSB*'])
   * @returns {array} - Found devices
   */
  discoverDevices(portPatterns = null) {
    // Simulated discovery - in real implementation would scan ports
    const discoveredDevices = [
      {
        id: 'device-001',
        type: 'GRBL',
        port: '/dev/ttyUSB0',
        name: 'GRBL CNC-1',
        description: '3-axis GRBL controller',
      },
      {
        id: 'device-002',
        type: 'LINUXCNC',
        port: 'localhost:5005',
        name: 'LinuxCNC Router',
        description: '5-axis LinuxCNC machine',
      },
    ];

    discoveredDevices.forEach((device) => {
      if (!this.devices.has(device.id)) {
        this.registerDevice(device);
      }
    });

    this.stats.devicesDiscovered += discoveredDevices.length;
    this.emit('devicesDiscovered', {
      count: discoveredDevices.length,
      devices: discoveredDevices,
    });

    return discoveredDevices;
  }

  /**
   * Register a device
   * @param {object} deviceConfig - Device configuration
   * @returns {boolean} - True if registered
   */
  registerDevice(deviceConfig) {
    if (!deviceConfig.id || !deviceConfig.type) {
      throw new Error('Invalid device configuration');
    }

    if (this.devices.size >= this.options.maxDevices) {
      throw new Error('Maximum device limit reached');
    }

    if (this.devices.has(deviceConfig.id)) {
      throw new Error(`Device ${deviceConfig.id} already registered`);
    }

    const adapter = this.adapters.get(deviceConfig.type.toUpperCase());
    if (!adapter) {
      throw new Error(`Unknown protocol: ${deviceConfig.type}`);
    }

    this.devices.set(deviceConfig.id, {
      id: deviceConfig.id,
      type: deviceConfig.type,
      name: deviceConfig.name || deviceConfig.id,
      description: deviceConfig.description || '',
      port: deviceConfig.port,
      config: deviceConfig.config || {},
      state: 'disconnected',
      lastStateChange: Date.now(),
      connectionAttempts: 0,
      lastError: null,
      metrics: {
        connected: false,
        uptime: 0,
        messagesReceived: 0,
        messagesSent: 0,
      },
    });

    this.emit('deviceRegistered', {
      deviceId: deviceConfig.id,
      type: deviceConfig.type,
    });

    return true;
  }

  /**
   * Connect to a device
   * @param {string} deviceId - Device identifier
   * @returns {Promise} - Connection promise
   */
  async connectDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    if (device.state === 'connected') {
      return true;
    }

    try {
      device.state = 'connecting';
      device.lastStateChange = Date.now();

      // Simulate connection
      await new Promise((resolve) => setTimeout(resolve, 100));

      device.state = 'connected';
      device.metrics.connected = true;
      device.connectionAttempts = 0;
      device.lastError = null;
      this.stats.devicesConnected++;

      this.emit('deviceConnected', { deviceId });
      return true;
    } catch (err) {
      device.state = 'error';
      device.lastError = err.message;
      device.connectionAttempts++;
      this.stats.connectionErrors++;

      this.emit('connectionError', {
        deviceId,
        error: err.message,
      });

      // Attempt reconnection
      if (device.connectionAttempts < this.options.reconnectAttempts) {
        this.stats.reconnectAttempts++;
        setTimeout(
          () => this.connectDevice(deviceId),
          this.options.reconnectDelay * device.connectionAttempts
        );
      }

      throw err;
    }
  }

  /**
   * Disconnect from a device
   * @param {string} deviceId - Device identifier
   * @returns {Promise} - Disconnection promise
   */
  async disconnectDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    try {
      device.state = 'disconnecting';

      // Simulate disconnection
      await new Promise((resolve) => setTimeout(resolve, 100));

      device.state = 'disconnected';
      device.metrics.connected = false;

      this.emit('deviceDisconnected', { deviceId });
      return true;
    } catch (err) {
      device.lastError = err.message;
      throw err;
    }
  }

  /**
   * Send command to device
   * @param {string} deviceId - Device identifier
   * @param {string} command - Command to send
   * @param {array} args - Optional command arguments
   * @returns {Promise} - Response
   */
  async sendCommand(deviceId, command, args = []) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    if (device.state !== 'connected') {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    const adapter = this.adapters.get(device.type.toUpperCase());
    if (!adapter) {
      throw new Error(`Adapter not found for ${device.type}`);
    }

    try {
      device.metrics.messagesSent++;

      // Simulate command execution
      const result = {
        command,
        args,
        status: 'ok',
        timestamp: Date.now(),
      };

      device.metrics.messagesReceived++;
      this.emit('commandExecuted', { deviceId, command });

      return result;
    } catch (err) {
      device.lastError = err.message;
      throw err;
    }
  }

  /**
   * Get device state
   * @param {string} deviceId - Device identifier
   * @returns {object} - Device state
   */
  getDeviceState(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    return {
      id: device.id,
      name: device.name,
      type: device.type,
      state: device.state,
      connected: device.metrics.connected,
      uptime: Date.now() - device.lastStateChange,
      lastError: device.lastError,
      metrics: { ...device.metrics },
    };
  }

  /**
   * Get all devices
   * @returns {array} - Device list
   */
  getDevices() {
    return Array.from(this.devices.values()).map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      state: d.state,
      connected: d.metrics.connected,
    }));
  }

  /**
   * Get device metrics
   * @param {string} deviceId - Device identifier
   * @returns {object} - Metrics
   */
  getDeviceMetrics(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    return {
      deviceId,
      ...device.metrics,
      connectionAttempts: device.connectionAttempts,
      lastStateChange: device.lastStateChange,
    };
  }

  /**
   * Get manager statistics
   * @returns {object} - Statistics
   */
  getStatistics() {
    const devices = Array.from(this.devices.values());
    const connectedCount = devices.filter((d) => d.state === 'connected').length;

    return {
      totalDevices: this.devices.size,
      connectedDevices: connectedCount,
      devicesDiscovered: this.stats.devicesDiscovered,
      devicesConnected: this.stats.devicesConnected,
      connectionErrors: this.stats.connectionErrors,
      reconnectAttempts: this.stats.reconnectAttempts,
      timestamp: Date.now(),
    };
  }

  /**
   * Event emitter pattern
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }
}

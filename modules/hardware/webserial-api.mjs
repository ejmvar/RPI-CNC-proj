/**
 * WebSerial API for Direct CNC Connection
 * Phase 15.4: Hardware Integration
 *
 * Provides browser-based WebSerial communication with:
 * - Port enumeration and selection
 * - Direct GRBL connection
 * - Real-time command streaming
 * - Automatic reconnection
 */

/* global navigator */

export class WebSerialAPI {
  constructor(options = {}) {
    this.options = {
      baudRate: options.baudRate || 115200,
      autoReconnect: options.autoReconnect !== false,
      reconnectDelay: options.reconnectDelay || 5000,
      readTimeout: options.readTimeout || 10000,
      bufferSize: options.bufferSize || 16384,
      ...options,
    };

    this.isConnected = false;
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.readBuffer = [];
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
  }

  /**
   * Check WebSerial support
   */
  static isSupported() {
    return typeof navigator !== 'undefined' && !!navigator.serial;
  }

  /**
   * Get available serial ports
   */
  async getPorts() {
    if (!WebSerialAPI.isSupported()) {
      throw new Error('WebSerial not supported');
    }

    try {
      const ports = await navigator.serial.getPorts();
      return ports.map((port) => {
        const info = port.getInfo();
        return {
          port,
          usbProductId: info.usbProductId,
          usbVendorId: info.usbVendorId,
          manufacturer: this.getPortInfo(info.usbVendorId, 'manufacturer'),
        };
      });
    } catch (error) {
      throw new Error(`Failed to get ports: ${error.message}`);
    }
  }

  /**
   * Request a port from user
   */
  async requestPort() {
    if (!WebSerialAPI.isSupported()) {
      throw new Error('WebSerial not supported');
    }

    try {
      const port = await navigator.serial.requestPort();
      return {
        port,
        usbProductId: port.getInfo().usbProductId,
        usbVendorId: port.getInfo().usbVendorId,
      };
    } catch (error) {
      if (error.name === 'NotFoundError') {
        throw new Error('No port selected');
      }
      throw new Error(`Failed to request port: ${error.message}`);
    }
  }

  /**
   * Connect to CNC machine
   */
  async connect(port) {
    if (this.isConnected) {
      throw new Error('Already connected');
    }

    if (!port) {
      throw new Error('Port required');
    }

    try {
      this.port = port;
      await this.port.open({ baudRate: this.options.baudRate });

      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();

      this.isConnected = true;
      this.reconnectAttempts = 0;

      this.emit('connected', {
        baudRate: this.options.baudRate,
        timestamp: Date.now(),
      });

      // Start reading data
      this.startReading();

      return { connected: true, baudRate: this.options.baudRate };
    } catch (error) {
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }

  /**
   * Disconnect from CNC machine
   */
  async disconnect() {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    try {
      if (this.reader) {
        await this.reader.cancel();
      }
      if (this.writer) {
        await this.writer.close();
      }
      if (this.port && this.port.readable) {
        await this.port.close();
      }

      this.isConnected = false;
      this.port = null;
      this.reader = null;
      this.writer = null;

      this.emit('disconnected', { timestamp: Date.now() });

      return { disconnected: true };
    } catch (error) {
      throw new Error(`Failed to disconnect: ${error.message}`);
    }
  }

  /**
   * Send command to CNC
   */
  async send(command) {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    if (!command) {
      throw new Error('Command required');
    }

    try {
      const cmd = command.trim();
      if (!cmd.endsWith('\n')) {
        cmd.concat('\n');
      }

      const encoded = new TextEncoder().encode(cmd);
      await this.writer.write(encoded);

      this.emit('command:sent', { command: cmd, bytes: encoded.length });

      return { sent: true, command: cmd, bytes: encoded.length };
    } catch (error) {
      throw new Error(`Failed to send command: ${error.message}`);
    }
  }

  /**
   * Start reading data from CNC
   */
  startReading() {
    const read = async () => {
      try {
        while (this.isConnected && this.reader) {
          const { value, done } = await this.reader.read();

          if (done) {
            this.handleDisconnect();
            break;
          }

          if (value) {
            const text = new TextDecoder().decode(value);
            this.handleData(text);
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.emit('error', { error: error.message });
          this.handleDisconnect();
        }
      }
    };

    read();
  }

  /**
   * Handle incoming data
   */
  handleData(data) {
    const lines = data.split('\n');

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
        // Status report
        this.emit('status', this.parseStatusReport(trimmed));
      } else if (trimmed === 'ok') {
        this.emit('ok', { timestamp: Date.now() });
      } else if (trimmed.startsWith('error')) {
        this.emit('error', { message: trimmed });
      } else {
        this.emit('data', { raw: trimmed });
      }
    });
  }

  /**
   * Parse GRBL status report
   */
  parseStatusReport(report) {
    const match = report.match(/<(.+?)>/);
    if (!match) return {};

    const parts = match[1].split('|');
    const status = {
      state: parts[0],
      mPos: { x: 0, y: 0, z: 0 },
      wPos: { x: 0, y: 0, z: 0 },
    };

    parts.forEach((part) => {
      if (part.startsWith('MPos:')) {
        const coords = part.replace('MPos:', '').split(',');
        status.mPos = {
          x: parseFloat(coords[0]),
          y: parseFloat(coords[1]),
          z: parseFloat(coords[2]),
        };
      }
      if (part.startsWith('WPos:')) {
        const coords = part.replace('WPos:', '').split(',');
        status.wPos = {
          x: parseFloat(coords[0]),
          y: parseFloat(coords[1]),
          z: parseFloat(coords[2]),
        };
      }
    });

    return status;
  }

  /**
   * Handle disconnection
   */
  handleDisconnect() {
    this.isConnected = false;

    if (this.options.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.emit('reconnecting', { attempt: this.reconnectAttempts });

      setTimeout(() => {
        if (this.port) {
          this.connect(this.port).catch(() => {
            // Retry will happen in handleDisconnect
          });
        }
      }, this.options.reconnectDelay);
    } else {
      this.emit('disconnected', { reason: 'connection lost' });
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      baudRate: this.options.baudRate,
      port: this.port ? 'connected' : 'none',
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Get port information
   */
  getPortInfo(vendorId) {
    const vendors = {
      9025: 'Arduino',
      5824: 'Digilent',
      10240: 'Silicon Labs',
    };
    return vendors[vendorId] || 'Unknown';
  }

  /**
   * Event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }
}

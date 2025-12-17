/**
 * Serial Port API
 * Phase 15.1: Desktop Application
 *
 * Provides serial port communication for GRBL and other CNC firmware
 */

export class SerialPortAPI {
  constructor() {
    this.ports = {};
    this.listeners = {};
  }

  /**
   * List available serial ports
   */
  async listPorts() {
    // In real implementation, would use serialport.list()
    return {
      success: true,
      ports: [
        {
          path: '/dev/ttyUSB0',
          manufacturer: 'FTDI',
          serialNumber: 'A1B2C3D4',
          description: 'FT232R USB UART',
          baudRate: 115200,
        },
        {
          path: '/dev/ttyACM0',
          manufacturer: 'Arduino',
          serialNumber: 'XXXXXXXXX',
          description: 'Arduino Uno',
          baudRate: 9600,
        },
      ],
    };
  }

  /**
   * Connect to serial port
   */
  async connect(portPath, options = {}) {
    const { baudRate = 115200, dataBits = 8, stopBits = 1, parity = 'none' } = options;

    // In real implementation, would use SerialPort
    const port = {
      path: portPath,
      isOpen: true,
      baudRate,
      dataBits,
      stopBits,
      parity,
      connectedAt: new Date().toISOString(),
      buffer: '',
      listeners: {},
    };

    this.ports[portPath] = port;

    return {
      success: true,
      port: portPath,
      connected: true,
      connectedAt: port.connectedAt,
    };
  }

  /**
   * Disconnect from serial port
   */
  async disconnect(portPath) {
    if (this.ports[portPath]) {
      this.ports[portPath].isOpen = false;
      delete this.ports[portPath];
    }

    return {
      success: true,
      port: portPath,
      connected: false,
    };
  }

  /**
   * Send data to serial port
   */
  async send(portPath, data) {
    if (!this.ports[portPath]) {
      return {
        success: false,
        error: `Port ${portPath} is not connected`,
        port: portPath,
      };
    }

    // In real implementation, would write to port
    return {
      success: true,
      port: portPath,
      data,
      dataSent: data.length,
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Receive data from serial port
   */
  async receive(portPath) {
    if (!this.ports[portPath]) {
      return {
        success: false,
        error: `Port ${portPath} is not connected`,
        port: portPath,
      };
    }

    return {
      success: true,
      port: portPath,
      data: this.ports[portPath].buffer,
      receivedAt: new Date().toISOString(),
    };
  }

  /**
   * Add event listener for data reception
   */
  on(portPath, event, callback) {
    if (!this.ports[portPath]) {
      return false;
    }

    if (!this.ports[portPath].listeners[event]) {
      this.ports[portPath].listeners[event] = [];
    }

    this.ports[portPath].listeners[event].push(callback);
    return true;
  }

  /**
   * Remove event listener
   */
  off(portPath, event, callback) {
    if (!this.ports[portPath]) {
      return false;
    }

    if (!this.ports[portPath].listeners[event]) {
      return false;
    }

    const index = this.ports[portPath].listeners[event].indexOf(callback);
    if (index > -1) {
      this.ports[portPath].listeners[event].splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Get port info
   */
  getPortInfo(portPath) {
    if (!this.ports[portPath]) {
      return {
        success: false,
        error: `Port ${portPath} is not connected`,
      };
    }

    const port = this.ports[portPath];
    return {
      success: true,
      port: portPath,
      isOpen: port.isOpen,
      baudRate: port.baudRate,
      dataBits: port.dataBits,
      stopBits: port.stopBits,
      parity: port.parity,
      connectedAt: port.connectedAt,
      bufferSize: port.buffer.length,
    };
  }

  /**
   * Clear port buffer
   */
  clearBuffer(portPath) {
    if (!this.ports[portPath]) {
      return {
        success: false,
        error: `Port ${portPath} is not connected`,
      };
    }

    this.ports[portPath].buffer = '';
    return {
      success: true,
      port: portPath,
    };
  }
}

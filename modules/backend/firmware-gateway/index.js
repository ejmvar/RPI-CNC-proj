const { EventEmitter } = require('events');

// Minimal GRBL firmware gateway stub that can simulate a serial connection.
// This module intentionally avoids native dependencies (e.g., serialport) so
// it remains testable and safe for CI environments.

class Gateway extends EventEmitter {
  constructor({ simulate = true } = {}) {
    super();
    this.simulate = !!simulate;
    this.connected = false;
    this._lastCommand = null;
  }

  async connect() {
    if (this.simulate) {
      // brief simulated delay
      await new Promise(r => setTimeout(r, 10));
      this.connected = true;
      this.emit('connected');
      return true;
    }
    // In a real implementation, we'd attempt serial port open here.
    throw new Error('non-simulated gateway not implemented');
  }

  async disconnect() {
    if (!this.connected) return false;
    if (this.simulate) {
      await new Promise(r => setTimeout(r, 5));
      this.connected = false;
      this.emit('disconnected');
      return true;
    }
    this.connected = false;
    return true;
  }

  async sendCommand(cmd) {
    if (!this.connected) throw new Error('not_connected');
    this._lastCommand = cmd;
    this.emit('commandSent', cmd);
    if (this.simulate) {
      // simulate an 'ok' response from GRBL
      await new Promise(r => setTimeout(r, 10));
      this.emit('data', `ok: ${cmd}`);
      return `ok: ${cmd}`;
    }
    throw new Error('sendCommand not implemented for real hardware');
  }

  lastCommand() { return this._lastCommand; }
}

function createGateway(opts = {}) {
  return new Gateway(opts);
}

module.exports = { createGateway, Gateway };

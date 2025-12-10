// Mock GRBL firmware interface for testing and simulation
// Simulates serial communication with GRBL-based CNC controller

class MockGRBL {
  constructor(opts = {}) {
    this.position = { x: 0, y: 0, z: 0 };
    this.feedRate = 0;
    this.state = 'Idle'; // Idle, Run, Hold, Alarm, Check, Home
    this.mode = 'G90'; // absolute positioning
    this.units = 'G21'; // metric
    this.queue = [];
    this.responseDelay = opts.responseDelay || 10; // ms
    this.listeners = { data: [], stateChange: [] };
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }

  // Simulate sending a command to GRBL
  send(command) {
    const cmd = command.trim();

    // Special commands
    if (cmd === '?') {
      this._sendStatusReport();
      return;
    }
    if (cmd === '$$') {
      this._sendSettings();
      return;
    }
    if (cmd === '$H') {
      this._executeHome();
      return;
    }
    if (cmd === '!') {
      this._executeFeedHold();
      return;
    }
    if (cmd === '~') {
      this._executeResume();
      return;
    }
    if (cmd.startsWith('$')) {
      this._sendOk();
      return;
    }

    // Queue G-code command
    this.queue.push(cmd);
    setTimeout(() => this._processCommand(cmd), this.responseDelay);
  }

  _processCommand(cmd) {
    const parsed = this._parseGCode(cmd);

    // Update position for movement commands
    if (parsed.G === 0 || parsed.G === 1) {
      if (parsed.X !== undefined) this.position.x = parsed.X;
      if (parsed.Y !== undefined) this.position.y = parsed.Y;
      if (parsed.Z !== undefined) this.position.z = parsed.Z;
      if (parsed.F !== undefined) this.feedRate = parsed.F;
      this.state = 'Run';
    }

    // Modal commands
    if (parsed.G === 90) this.mode = 'G90';
    if (parsed.G === 91) this.mode = 'G91';
    if (parsed.G === 20) this.units = 'G20';
    if (parsed.G === 21) this.units = 'G21';

    // Spindle commands
    if (parsed.M === 3 || parsed.M === 4) {
      this.emit('stateChange', { spindle: 'on' });
    }
    if (parsed.M === 5) {
      this.emit('stateChange', { spindle: 'off' });
    }

    this._sendOk();

    // Simulate completion
    setTimeout(() => {
      this.state = 'Idle';
      this.emit('stateChange', { state: this.state, position: this.position });
    }, this.responseDelay * 2);
  }

  _parseGCode(line) {
    const params = {};
    const regex = /([A-Z])(-?\d+\.?\d*)/gi;
    let match;
    while ((match = regex.exec(line)) !== null) {
      params[match[1].toUpperCase()] = parseFloat(match[2]);
    }
    return params;
  }

  _sendOk() {
    this.emit('data', 'ok\n');
  }

  _sendStatusReport() {
    const status = `<${this.state}|MPos:${this.position.x.toFixed(3)},${this.position.y.toFixed(
      3
    )},${this.position.z.toFixed(3)}|FS:${this.feedRate},0>\n`;
    this.emit('data', status);
  }

  _sendSettings() {
    const settings = [
      '$0=10 (Step pulse time, microseconds)',
      '$1=25 (Step idle delay, milliseconds)',
      '$2=0 (Step pulse invert, mask)',
      '$3=0 (Step direction invert, mask)',
      '$100=250.000 (X-axis travel resolution, step/mm)',
      '$101=250.000 (Y-axis travel resolution, step/mm)',
      '$102=250.000 (Z-axis travel resolution, step/mm)',
      '$110=500.000 (X-axis maximum rate, mm/min)',
      '$111=500.000 (Y-axis maximum rate, mm/min)',
      '$112=500.000 (Z-axis maximum rate, mm/min)',
      '$130=200.000 (X-axis maximum travel, millimeters)',
      '$131=200.000 (Y-axis maximum travel, millimeters)',
      '$132=200.000 (Z-axis maximum travel, millimeters)',
    ];
    settings.forEach((s) => this.emit('data', s + '\n'));
    this._sendOk();
  }

  _executeHome() {
    this.state = 'Home';
    this.emit('stateChange', { state: this.state });
    setTimeout(() => {
      this.position = { x: 0, y: 0, z: 0 };
      this.state = 'Idle';
      this.emit('stateChange', { state: this.state, position: this.position });
      this._sendOk();
    }, this.responseDelay * 10);
  }

  _executeFeedHold() {
    this.state = 'Hold';
    this.emit('stateChange', { state: this.state });
    this.emit('data', 'ok\n');
  }

  _executeResume() {
    if (this.state === 'Hold') {
      this.state = 'Run';
      this.emit('stateChange', { state: this.state });
    }
    this.emit('data', 'ok\n');
  }

  // Get current position
  getPosition() {
    return { ...this.position };
  }

  // Get current state
  getState() {
    return {
      state: this.state,
      position: this.position,
      feedRate: this.feedRate,
      mode: this.mode,
      units: this.units,
    };
  }

  // Reset to initial state
  reset() {
    this.position = { x: 0, y: 0, z: 0 };
    this.feedRate = 0;
    this.state = 'Idle';
    this.mode = 'G90';
    this.units = 'G21';
    this.queue = [];
    this.emit('data', "\nGrbl 1.1h ['$' for help]\n");
  }
}

function createMockGRBL(opts) {
  return new MockGRBL(opts);
}

module.exports = { createMockGRBL, MockGRBL };

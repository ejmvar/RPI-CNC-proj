const { EventEmitter } = require('events');

class PositionStreamer extends EventEmitter {
  constructor({ intervalMs = 100 } = {}) {
    super();
    this.intervalMs = intervalMs;
    this._timer = null;
    this._pos = { x: 0, y: 0, z: 0 };
    this._tick = 0;
  }

  start() {
    if (this._timer) return;
    this.emit('start');
    this._timer = setInterval(() => {
      // simple synthetic progression
      this._tick++;
      this._pos.x += 0.5;
      this._pos.y += 0.25;
      this._pos.z += Math.sin(this._tick / 10) * 0.1;
      this.emit('position', Object.assign({}, this._pos));
    }, this.intervalMs);
  }

  stop() {
    if (!this._timer) return;
    clearInterval(this._timer);
    this._timer = null;
    this.emit('stop');
  }

  isRunning() { return !!this._timer; }
}

function createStreamer(opts) { return new PositionStreamer(opts); }

module.exports = { PositionStreamer, createStreamer };

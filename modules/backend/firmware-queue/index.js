const { EventEmitter } = require('events');

class CommandQueue extends EventEmitter {
  constructor() {
    super();
    this._q = [];
    this._processing = false;
  }

  enqueue(cmd) {
    this._q.push(cmd);
    this.emit('enqueue', cmd);
    return cmd;
  }

  dequeue() {
    const cmd = this._q.shift();
    if (cmd) this.emit('dequeue', cmd);
    return cmd;
  }

  peek() { return this._q[0]; }

  size() { return this._q.length; }

  clear() {
    this._q = [];
    this.emit('cleared');
  }

  async processNext(handler) {
    if (this._processing) throw new Error('already_processing');
    const cmd = this.dequeue();
    if (!cmd) return null;
    this._processing = true;
    this.emit('processing', cmd);
    try {
      const res = await handler(cmd);
      this.emit('processed', { cmd, res });
      return { cmd, res };
    } finally {
      this._processing = false;
    }
  }
}

function createQueue() { return new CommandQueue(); }

module.exports = { CommandQueue, createQueue };

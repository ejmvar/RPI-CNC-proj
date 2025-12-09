const { spawnSync } = require('child_process');
const path = require('path');

describe('browser collab client (esm)', () => {
  test('sends create/update messages and receives sessionUpdated', () => {
    // Resolve relative to the repository root (process.cwd()) so the absolute
    // path is stable no matter where the test runner places __dirname.
    const filepath = path.resolve(process.cwd(), 'Simulator/web/js/collab-client.mjs');
    const script = `
      globalThis.WebSocket = class MockWS {
        constructor(url) { this.url = url; this._handlers = {}; this._sent = []; setTimeout(()=>{ if (this._handlers.open) this._handlers.open.forEach(cb=>cb()) }, 5); }
        addEventListener(ev, cb) { this._handlers[ev] = this._handlers[ev] || []; this._handlers[ev].push(cb); }
        send(d) { this._sent.push(d); }
        close() { if (this._handlers.close) this._handlers.close.forEach(cb=>cb()); }
        _triggerMessage(obj) { const data = typeof obj === 'string' ? obj : JSON.stringify(obj); if (this._handlers.message) this._handlers.message.forEach(cb=>cb({ data })); }
      };

      // Import using an absolute file URL so the spawned node process can
      // resolve the module correctly regardless of its current working dir.
      import('file://${filepath.replace(/\\\\/g, '/')}').then(m => {
        const c = m.createCollabClient('ws://localhost/c');
        c.connect();
        // wait briefly to allow open to fire
        setTimeout(() => {
          c.createSession('s1', { a: 1 });
          // created message should be sent
          const ws = c._getSocket();
          // check the raw sent payload
          const obj = JSON.parse(ws._sent.find(s => s.includes('create')));
          console.log(JSON.stringify({ createSent: obj.action === 'create' }));

          // subscribe to sessionUpdated and simulate a server update
          let sawUpdate = false;
          c.on('sessionUpdated', (msg) => { sawUpdate = true; console.log(JSON.stringify({ updated: msg.state })); });
          // server message
          ws._triggerMessage({ type: 'sessionUpdated', sessionId: 's1', state: { a: 2 } });
          setTimeout(()=>{
            console.log(JSON.stringify({ sawUpdate }));
            process.exit(0);
          }, 10);
        }, 10);
      }).catch(e=>{ console.error(e); process.exit(2); });
    `;

    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 5000 });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('subprocess failed'); }
    const out = r.stdout.trim().split(/\r?\n/).map(l => JSON.parse(l)).reduce((acc, x) => Object.assign(acc, x), {});
    expect(out.createSent).toBe(true);
    expect(out.updated).toEqual({ a: 2 });
    expect(out.sawUpdate).toBe(true);
  });
});

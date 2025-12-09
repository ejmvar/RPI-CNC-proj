const { saveSession, loadSession, SESSIONS_DIR } = require('../../../modules/backend/session');
const fs = require('fs');
const path = require('path');

describe('session persistence helpers', () => {
  test('save and load session roundtrip', () => {
    const filename = 'test-session.json';
    const obj = { name: 'demo', pos: { x: 1, y: 2, z: 3 } };
    const fp = saveSession(filename, obj);
    expect(fp).toContain('test-session.json');
    const loaded = loadSession(filename);
    expect(loaded).toEqual(obj);

    // cleanup
    const full = path.join(SESSIONS_DIR, filename);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  });
});

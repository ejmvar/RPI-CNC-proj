const path = require('path');
const fs = require('fs');

const server = require('../../../modules/backend/server/index.js');

describe('Minimal backend server', () => {
  test('write and read file workflow', async () => {
    const filename = 'test-upload.nc';
    const content = 'G1 X0 Y0 Z0\nG1 X10 Y10 Z-1';
    // write using module helper
    const up = server.writeGCodeFile(filename, content);
    expect(up.filename).toBe(filename);

    // read back
    const read = server.readGCodeFile(filename);
    expect(read).toBe(content);

    // cleanup
    const fp = path.join(server.STORAGE_DIR, filename);
    expect(fs.existsSync(fp)).toBe(true);
    fs.unlinkSync(fp);
  });
  test('reading a non-existing file throws ENOENT', () => {
    expect(() => server.readGCodeFile('definitely-not-there.nc')).toThrow();
  });
});

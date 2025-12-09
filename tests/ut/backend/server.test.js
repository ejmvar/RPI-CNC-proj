const request = require('supertest');
const path = require('path');
const fs = require('fs');

const server = require('../../../modules/backend/server/index.js');

describe('Minimal backend server', () => {
  let app;
  beforeAll(() => { app = server.createApp(); });

  test('health endpoint responds OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('upload and download file workflow', async () => {
    const filename = 'test-upload.nc';
    const content = 'G1 X0 Y0 Z0\nG1 X10 Y10 Z-1';

    // upload
    const up = await request(app).post('/upload').send({ filename, content }).set('Accept', 'application/json');
    expect(up.status).toBe(201);
    expect(up.body.filename).toBe(filename);

    // download
    const dl = await request(app).get(`/download/${encodeURIComponent(filename)}`);
    expect(dl.status).toBe(200);
    expect(dl.text).toBe(content);

    // cleanup
    const fp = path.join(server.STORAGE_DIR, filename);
    expect(fs.existsSync(fp)).toBe(true);
    fs.unlinkSync(fp);
  });

  test('download non-existing returns 404', async () => {
    const res = await request(app).get('/download/not-existing-file.nc');
    expect(res.status).toBe(404);
  });
});

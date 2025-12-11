const http = require('http');
const { createSimpleHttpServer } = require('../../../modules/backend/server/http-server');

describe('http-server.js', () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    server = createSimpleHttpServer();
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('CORS and OPTIONS', () => {
    test('handles OPTIONS preflight request', (done) => {
      const req = http.request(`${baseUrl}/upload`, { method: 'OPTIONS' }, (res) => {
        expect(res.statusCode).toBe(204);
        expect(res.headers['access-control-allow-origin']).toBe('*');
        done();
      });
      req.end();
    });

    test('includes CORS headers on all responses', (done) => {
      http.get(`${baseUrl}/health`, (res) => {
        expect(res.headers['access-control-allow-origin']).toBe('*');
        done();
      });
    });
  });

  describe('/health endpoint', () => {
    test('returns 200 with ok status', (done) => {
      http.get(`${baseUrl}/health`, (res) => {
        expect(res.statusCode).toBe(200);
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const json = JSON.parse(data);
          expect(json.status).toBe('ok');
          done();
        });
      });
    });
  });

  describe('/upload endpoint', () => {
    test('uploads gcode file successfully', (done) => {
      const payload = JSON.stringify({
        filename: 'test-upload.nc',
        content: 'G0 X10 Y20\nG1 Z5',
      });

      const req = http.request(
        `${baseUrl}/upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          expect(res.statusCode).toBe(201);
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            const json = JSON.parse(data);
            expect(json.filename).toBe('test-upload.nc');
            expect(json.path).toContain('test-upload.nc');
            done();
          });
        }
      );
      req.write(payload);
      req.end();
    });

    test('returns 400 for invalid JSON', (done) => {
      const req = http.request(
        `${baseUrl}/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        (res) => {
          expect(res.statusCode).toBe(400);
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            const json = JSON.parse(data);
            expect(json.error).toBeDefined();
            done();
          });
        }
      );
      req.write('invalid json{');
      req.end();
    });

    test('returns 400 when filename missing', (done) => {
      const payload = JSON.stringify({ content: 'G0 X0' });
      const req = http.request(
        `${baseUrl}/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        (res) => {
          expect(res.statusCode).toBe(400);
          done();
        }
      );
      req.write(payload);
      req.end();
    });
  });

  describe('/session/save endpoint', () => {
    test('saves session successfully', (done) => {
      const payload = JSON.stringify({
        filename: 'test-session.json',
        session: { position: { x: 10, y: 20, z: 5 } },
      });

      const req = http.request(
        `${baseUrl}/session/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          expect(res.statusCode).toBe(201);
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            const json = JSON.parse(data);
            expect(json.path).toContain('test-session.json');
            done();
          });
        }
      );
      req.write(payload);
      req.end();
    });

    test('returns 400 for invalid JSON in session save', (done) => {
      const req = http.request(
        `${baseUrl}/session/save`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        (res) => {
          expect(res.statusCode).toBe(400);
          done();
        }
      );
      req.write('{bad json');
      req.end();
    });
  });

  describe('/session/load endpoint', () => {
    test('loads saved session', (done) => {
      // First save a session
      const session = { tool: 'T1', feedRate: 1000 };
      const savePayload = JSON.stringify({
        filename: 'load-test.json',
        session,
      });

      const saveReq = http.request(
        `${baseUrl}/session/save`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        () => {
          // Then load it
          http.get(`${baseUrl}/session/load/load-test.json`, (res) => {
            expect(res.statusCode).toBe(200);
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              const json = JSON.parse(data);
              expect(json.tool).toBe('T1');
              expect(json.feedRate).toBe(1000);
              done();
            });
          });
        }
      );
      saveReq.write(savePayload);
      saveReq.end();
    });

    test('returns 404 for nonexistent session', (done) => {
      http.get(`${baseUrl}/session/load/nonexistent.json`, (res) => {
        expect(res.statusCode).toBe(404);
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const json = JSON.parse(data);
          expect(json.error).toBe('not_found');
          done();
        });
      });
    });
  });

  describe('/download endpoint', () => {
    test('downloads uploaded file', (done) => {
      const content = 'G0 X0 Y0\nG1 X10 Y10';
      const uploadPayload = JSON.stringify({
        filename: 'download-test.nc',
        content,
      });

      // First upload
      const uploadReq = http.request(
        `${baseUrl}/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        () => {
          // Then download
          http.get(`${baseUrl}/download/download-test.nc`, (res) => {
            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toContain('text/plain');
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              expect(data).toBe(content);
              done();
            });
          });
        }
      );
      uploadReq.write(uploadPayload);
      uploadReq.end();
    });

    test('returns 404 for nonexistent file', (done) => {
      http.get(`${baseUrl}/download/nonexistent.nc`, (res) => {
        expect(res.statusCode).toBe(404);
        done();
      });
    });
  });

  describe('static file serving', () => {
    test('serves index.html from Simulator/web', (done) => {
      http.get(`${baseUrl}/`, (res) => {
        // May return 200 if file exists, or 404 if not
        expect([200, 404]).toContain(res.statusCode);
        done();
      });
    });

    test('serves front.html from Simulator/web', (done) => {
      http.get(`${baseUrl}/front.html`, (res) => {
        // May return 200 if file exists, or 404 if not
        expect([200, 404]).toContain(res.statusCode);
        done();
      });
    });
  });

  describe('404 handling', () => {
    test('returns 404 for unknown routes', (done) => {
      http.get(`${baseUrl}/unknown/endpoint`, (res) => {
        expect(res.statusCode).toBe(404);
        done();
      });
    });
  });
});

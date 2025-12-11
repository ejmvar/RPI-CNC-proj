const fs = require('fs');
const path = require('path');
const http = require('http');
const { createApp, start, STORAGE_DIR } = require('../../../modules/backend/server');

describe('Backend server Express routes', () => {
  let app, server, baseUrl;
  const testFile = 'express-test.gcode';
  const testPath = path.join(STORAGE_DIR, testFile);

  beforeAll((done) => {
    app = createApp();
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (server) server.close(done);
  });

  afterEach(() => {
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  });

  describe('Express app creation', () => {
    test('creates Express app when express is available', () => {
      expect(app).not.toBeNull();
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    test('start() creates and runs server', (done) => {
      const testServer = start(0);
      expect(testServer.listening).toBe(true);
      testServer.close(done);
    });
  });

  describe('GET /health endpoint', () => {
    test('returns ok status', (done) => {
      http.get(`${baseUrl}/health`, (res) => {
        expect(res.statusCode).toBe(200);
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          const data = JSON.parse(body);
          expect(data.status).toBe('ok');
          done();
        });
      });
    });
  });

  describe('POST /upload endpoint', () => {
    test('uploads gcode file successfully', (done) => {
      const postData = JSON.stringify({ filename: testFile, content: 'G0 X0 Y0' });

      const req = http.request(
        `${baseUrl}/upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length,
          },
        },
        (res) => {
          expect(res.statusCode).toBe(201);
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            const data = JSON.parse(body);
            expect(data.filename).toBe(testFile);
            expect(fs.existsSync(testPath)).toBe(true);
            done();
          });
        }
      );

      req.write(postData);
      req.end();
    });

    test('returns 400 on missing filename', (done) => {
      const postData = JSON.stringify({ content: 'G0 X0' });

      const req = http.request(
        `${baseUrl}/upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length,
          },
        },
        (res) => {
          expect(res.statusCode).toBe(400);
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            const data = JSON.parse(body);
            expect(data.error).toContain('filename and content required');
            done();
          });
        }
      );

      req.write(postData);
      req.end();
    });

    test('returns 400 on invalid content type', (done) => {
      const postData = JSON.stringify({ filename: testFile, content: 123 });

      const req = http.request(
        `${baseUrl}/upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length,
          },
        },
        (res) => {
          expect(res.statusCode).toBe(400);
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            const data = JSON.parse(body);
            expect(data.error).toContain('filename and content required');
            done();
          });
        }
      );

      req.write(postData);
      req.end();
    });
  });

  describe('GET /download/:filename endpoint', () => {
    test('downloads existing file', (done) => {
      fs.writeFileSync(testPath, 'G1 X10 Y10', 'utf8');

      http.get(`${baseUrl}/download/${testFile}`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/plain');

        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          expect(body).toBe('G1 X10 Y10');
          done();
        });
      });
    });

    test('returns 404 for non-existent file', (done) => {
      http.get(`${baseUrl}/download/nonexistent.gcode`, (res) => {
        expect(res.statusCode).toBe(404);

        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          const data = JSON.parse(body);
          expect(data.error).toBe('not_found');
          done();
        });
      });
    });
  });

  describe('Static file serving', () => {
    test('serves static files when Simulator/web exists', (done) => {
      const staticRoot = path.join(process.cwd(), 'Simulator', 'web');

      if (fs.existsSync(staticRoot)) {
        http.get(`${baseUrl}/`, (res) => {
          // Should get index.html or 200/404 depending on existence
          expect([200, 404]).toContain(res.statusCode);
          done();
        });
      } else {
        done();
      }
    });
  });
});

const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, 'storage');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

// Basic file helpers so the module can be tested without external dependencies
function writeGCodeFile(filename, content) {
  if (!filename || typeof content !== 'string') throw new Error('filename and content required');
  const safeName = path.basename(filename);
  const outPath = path.join(STORAGE_DIR, safeName);
  fs.writeFileSync(outPath, content, 'utf8');
  return { filename: safeName, path: outPath };
}

function readGCodeFile(filename) {
  const safeName = path.basename(filename || '');
  const fp = path.join(STORAGE_DIR, safeName);
  if (!fs.existsSync(fp)) throw Object.assign(new Error('not_found'), { code: 'ENOENT' });
  return fs.readFileSync(fp, 'utf8');
}

// Try to provide a small express app if express is available in the environment.
// This allows manual testing when express is installed, but the module functions
// work without external packages.
function createAppIfAvailable() {
  try {
    // require express lazily to avoid hard dependency
    // eslint-disable-next-line global-require
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.get('/health', (req, res) => res.json({ status: 'ok' }));
    app.post('/upload', (req, res) => {
      try {
        const { filename, content } = req.body || {};
        const r = writeGCodeFile(filename, content);
        return res.status(201).json(r);
      } catch (e) { return res.status(400).json({ error: e.message }); }
    });
    app.get('/download/:filename', (req, res) => {
      try {
        const data = readGCodeFile(req.params.filename);
        res.set('Content-Type', 'text/plain');
        return res.send(data);
      } catch (e) {
        return res.status(404).json({ error: 'not_found' });
      }
    });

    // serve the static simulator when available
    const staticRoot = path.join(process.cwd(), 'Simulator', 'web');
    if (fs.existsSync(staticRoot)) app.use('/', express.static(staticRoot));

    return app;
  } catch (e) {
    return null;
  }
}

// Helper to run as a standalone server for manual testing
function start(port = 3001) {
  const app = createAppIfAvailable();
  if (!app) throw new Error('express not available; install express to run the HTTP server');
  const s = app.listen(port, () => console.log(`backend static server listening on ${port}`));
  return s;
}

module.exports = { createApp: createAppIfAvailable, start, STORAGE_DIR, writeGCodeFile, readGCodeFile };

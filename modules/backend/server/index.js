const express = require('express');
const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, 'storage');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Upload gcode via JSON body { filename, content }
  app.post('/upload', (req, res) => {
    const { filename, content } = req.body || {};
    if (!filename || typeof content !== 'string') return res.status(400).json({ error: 'filename and content are required' });
    const safeName = path.basename(filename);
    const outPath = path.join(STORAGE_DIR, safeName);
    try {
      fs.writeFileSync(outPath, content, 'utf8');
      return res.status(201).json({ filename: safeName, path: outPath });
    } catch (e) {
      console.error('upload failed', e);
      return res.status(500).json({ error: 'write_failed' });
    }
  });

  // Download a stored gcode by filename
  app.get('/download/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename || '');
    const fp = path.join(STORAGE_DIR, safeName);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'not_found' });
    return res.sendFile(fp);
  });

  // Static file serving (serve project web simulator by default)
  const staticRoot = path.join(process.cwd(), 'Simulator', 'web');
  if (fs.existsSync(staticRoot)) {
    app.use('/', express.static(staticRoot));
  }

  return app;
}

// Helper to run as a standalone server for manual testing
function start(port = 3001) {
  const app = createApp();
  const s = app.listen(port, () => console.log(`backend static server listening on ${port}`));
  return s;
}

module.exports = { createApp, start, STORAGE_DIR };

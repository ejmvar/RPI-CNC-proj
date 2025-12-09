const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { writeGCodeFile, readGCodeFile, STORAGE_DIR } = require('./index');
const { saveSession, loadSession } = require('../session');

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

function createSimpleHttpServer() {
  const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    // health
    if (req.method === 'GET' && parsed.pathname === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      return res.end(JSON.stringify({ status: 'ok' }));
    }

    if (req.method === 'POST' && parsed.pathname === '/upload') {
      try {
        const body = await parseJSONBody(req);
        const { filename, content } = body;
        const r = writeGCodeFile(filename, content);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(201);
        return res.end(JSON.stringify(r));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    if (req.method === 'POST' && parsed.pathname === '/session/save') {
      try {
        const body = await parseJSONBody(req);
        const { filename, session } = body || {};
        const fp = saveSession(filename, session);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(201);
        return res.end(JSON.stringify({ path: fp }));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    if (req.method === 'GET' && parsed.pathname.startsWith('/session/load/')) {
      try {
        const safe = parsed.pathname.replace('/session/load/', '');
        const obj = loadSession(safe);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        return res.end(JSON.stringify(obj));
      } catch (e) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: 'not_found' }));
      }
    }

    // download
    if (req.method === 'GET' && parsed.pathname.startsWith('/download/')) {
      const safe = path.basename(parsed.pathname.replace('/download/', ''));
      const fp = path.join(STORAGE_DIR, safe);
      if (!fs.existsSync(fp)) { res.writeHead(404); return res.end(JSON.stringify({ error: 'not_found' })); }
      res.setHeader('Content-Type', 'text/plain');
      res.writeHead(200);
      return fs.createReadStream(fp).pipe(res);
    }

    // try to serve static files from Simulator/web if present
    const staticRoot = path.join(process.cwd(), 'Simulator', 'web');
    if (fs.existsSync(staticRoot)) {
      let filePath = path.join(staticRoot, parsed.pathname === '/' ? '/front.html' : parsed.pathname);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.html') res.setHeader('Content-Type', 'text/html');
        if (ext === '.js') res.setHeader('Content-Type', 'application/javascript');
        if (ext === '.css') res.setHeader('Content-Type', 'text/css');
        res.writeHead(200);
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    res.writeHead(404);
    res.end('not found');
  });

  return server;
}

module.exports = { createSimpleHttpServer };

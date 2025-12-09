const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

function saveSession(filename, sessionObj) {
  if (!filename || typeof sessionObj !== 'object') throw new Error('filename and session object required');
  const safeName = path.basename(filename);
  const fp = path.join(SESSIONS_DIR, safeName);
  fs.writeFileSync(fp, JSON.stringify(sessionObj, null, 2), 'utf8');
  return fp;
}

function loadSession(filename) {
  const safeName = path.basename(filename || '');
  const fp = path.join(SESSIONS_DIR, safeName);
  if (!fs.existsSync(fp)) throw Object.assign(new Error('not_found'), { code: 'ENOENT' });
  const raw = fs.readFileSync(fp, 'utf8');
  return JSON.parse(raw);
}

function listSessions() {
  return fs.readdirSync(SESSIONS_DIR).filter(f => fs.statSync(path.join(SESSIONS_DIR, f)).isFile());
}

module.exports = { saveSession, loadSession, listSessions, SESSIONS_DIR };

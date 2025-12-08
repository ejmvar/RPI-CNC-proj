// Minimal G-Code parser for unit tests and initial modularization.
// Exports: parseLine(line) -> object and parse(text) -> array

function normalizeLine(line) {
  return String(line || '').trim().toUpperCase();
}

function parseLine(line) {
  const l = normalizeLine(line);
  if (!l || l.startsWith(';') || l.startsWith('(')) return null;

  const tokens = l.split(/\s+/);
  const cmd = { raw: line, codes: [], params: {} };

  tokens.forEach(tok => {
    if (!tok) return;
    // Letter + number e.g. X10.5, G1, M3, F500
    const m = tok.match(/^([A-Z])(.*)$/i);
    if (m) {
      const letter = m[1];
      const value = m[2] === '' ? true : Number(m[2]);
      cmd.codes.push(letter + (m[2] === '' ? '' : String(m[2])));
      cmd.params[letter] = value;
    } else {
      // fallback - keep token
      cmd.codes.push(tok);
    }
  });

  return cmd;
}

function parse(text) {
  if (!text) return [];
  return String(text)
    .split(/\r?\n/)
    .map(line => parseLine(line))
    .filter(x => x !== null);
}

module.exports = { parseLine, parse };

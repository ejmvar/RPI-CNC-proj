// Browser-safe ES module wrapper for G-Code parsing used by the front-end
export function normalizeLine(line) {
  return String(line || '').trim().toUpperCase();
}

export function parseLine(line) {
  const l = normalizeLine(line);
  if (!l || l.startsWith(';') || l.startsWith('(')) return null;

  const tokens = l.split(/\s+/);
  const cmd = { raw: line, codes: [], params: {} };

  tokens.forEach(tok => {
    if (!tok) return;
    const m = tok.match(/^([A-Z])(.*)$/i);
    if (m) {
      const letter = m[1];
      const value = m[2] === '' ? true : Number(m[2]);
      cmd.codes.push(letter + (m[2] === '' ? '' : String(m[2])));
      cmd.params[letter] = value;
    } else {
      cmd.codes.push(tok);
    }
  });

  return cmd;
}

export function parse(text) {
  if (!text) return [];
  return String(text)
    .split(/\r?\n/)
    .map(line => parseLine(line))
    .filter(x => x !== null);
}

// Convenience default
export default { parse, parseLine };

// ES module version of the minimal G-Code parser (same behavior as CommonJS parser.js)
function normalizeLine(line) {
  return String(line || '')
    .trim()
    .toUpperCase();
}

export function parseLine(line) {
  const l = normalizeLine(line);
  if (!l || l.startsWith(';') || l.startsWith('(')) return null;

  const tokens = l.split(/\s+/);
  const cmd = { raw: line, codes: [], params: {} };

  tokens.forEach((tok) => {
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

  // Parse tool-related commands
  // T command: tool selection (T0, T1, T2, etc.)
  if ('T' in cmd.params) {
    cmd.toolSelect = cmd.params.T;
  }

  // M6: tool change command
  if (cmd.raw && /(^|\s)M6(\s|$)/i.test(cmd.raw)) {
    cmd.toolChange = true;
  }

  // G43: tool length offset enable
  if (cmd.raw && /(^|\s)G43(\s|$)/i.test(cmd.raw)) {
    cmd.toolLengthOffset = true;
    // H parameter specifies which offset to use
    if ('H' in cmd.params) {
      cmd.toolOffsetIndex = cmd.params.H;
    }
  }

  // G49: cancel tool length offset
  if (cmd.raw && /(^|\s)G49(\s|$)/i.test(cmd.raw)) {
    cmd.cancelToolOffset = true;
  }

  return cmd;
}

export function parse(text) {
  if (!text) return [];
  return String(text)
    .split(/\r?\n/)
    .map((line) => parseLine(line))
    .filter((x) => x !== null);
}

export default { parse, parseLine };

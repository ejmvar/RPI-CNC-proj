// Simple G-Code validator
// Checks for: lines start with known commands or comments, numeric parameters parse

export function validateGCode(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const errors = [];
  const allowedCmds = ['G0','G1','G2','G3','M3','M5','F','X','Y','Z','S',';'];
  lines.forEach((ln, idx) => {
    // comments start with ; or (
    if (ln.startsWith(';') || ln.startsWith('(')) return;
    const parts = ln.split(/\s+/);
    // check each token
    parts.forEach(tok => {
      // token like G1 or X10 or F1000 or N1
      const m = tok.match(/^([A-Za-z]+)([-+]?[0-9]*\.?[0-9]+)?$/);
      if (!m) {
        errors.push({ line: idx+1, token: tok, message: 'invalid token' });
      } else {
        const letter = m[1].toUpperCase();
        // allowed command letters (G, M, X/Y/Z, F, S, N for line numbers)
        const allowedLetters = ['G','M','X','Y','Z','F','S','N'];
        if (!allowedLetters.includes(letter)) {
          errors.push({ line: idx+1, token: tok, message: `unknown code ${letter}` });
        }
      }
    });
  });

  return { ok: errors.length === 0, errors };
}

export default { validateGCode };

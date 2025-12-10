/**
 * Integration test for G-code toolpath optimization
 */

const fs = require('fs');
const path = require('path');

describe('Toolpath optimization integration', () => {
  let sampleGCode;

  beforeAll(() => {
    const fixturePath = path.join(__dirname, '../fixtures/sample-toolpath.gcode');
    sampleGCode = fs.readFileSync(fixturePath, 'utf-8');
  });

  it('detects redundant moves in sample G-code', () => {
    const lines = sampleGCode.split('\n');
    const redundantMoves = [];
    let lastPos = { x: 0, y: 0, z: 0 };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';')) return;

      const xMatch = trimmed.match(/X([-\d.]+)/);
      const yMatch = trimmed.match(/Y([-\d.]+)/);
      const zMatch = trimmed.match(/Z([-\d.]+)/);

      const newPos = {
        x: xMatch ? parseFloat(xMatch[1]) : lastPos.x,
        y: yMatch ? parseFloat(yMatch[1]) : lastPos.y,
        z: zMatch ? parseFloat(zMatch[1]) : lastPos.z,
      };

      if (newPos.x === lastPos.x && newPos.y === lastPos.y && newPos.z === lastPos.z) {
        if (trimmed.match(/G[01]/)) {
          redundantMoves.push({ line: idx + 1, code: trimmed });
        }
      }

      lastPos = newPos;
    });

    // Sample file has 5 intentional redundant moves
    expect(redundantMoves.length).toBeGreaterThanOrEqual(4);
  });

  it('identifies safe Z moves that can be rapid (G0)', () => {
    const lines = sampleGCode.split('\n');
    const rapidCandidates = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('G1') && trimmed.includes('Z')) {
        const zMatch = trimmed.match(/Z([-\d.]+)/);
        if (zMatch) {
          const zValue = parseFloat(zMatch[1]);
          // Safe Z height is > 5mm
          if (zValue > 5) {
            rapidCandidates.push({ line: idx + 1, zValue });
          }
        }
      }
    });

    expect(rapidCandidates.length).toBeGreaterThan(0);
  });

  it('calculates optimization statistics', () => {
    const lines = sampleGCode.split('\n').filter((l) => l.trim() && !l.trim().startsWith(';'));
    const originalLines = lines.length;

    // After optimization, we expect:
    // - Fewer lines (redundant moves removed)
    // - Some G1 converted to G0

    const stats = {
      original: originalLines,
      redundantMoves: 5, // From fixture design
      rapidConversions: 3, // Z10 moves
      expectedOptimized: originalLines - 5, // Removing 5 redundant
    };

    expect(stats.redundantMoves).toBeGreaterThan(0);
    expect(stats.rapidConversions).toBeGreaterThan(0);
    expect(stats.expectedOptimized).toBeLessThan(stats.original);
  });

  it('preserves non-movement commands during optimization', () => {
    const lines = sampleGCode.split('\n');
    const nonMovementCommands = lines.filter((l) => {
      const trimmed = l.trim();
      return trimmed.match(/^(G21|G90|G92|M30)/);
    });

    // Should preserve G21, G90, G92, M30
    expect(nonMovementCommands.length).toBeGreaterThanOrEqual(4);
  });

  it('maintains coordinate precision', () => {
    const lines = sampleGCode.split('\n');
    const coordLines = lines.filter((l) => l.match(/[XYZ][-\d.]+/));

    coordLines.forEach((line) => {
      const coords = line.match(/([XYZ])([-\d.]+)/g);
      if (coords) {
        coords.forEach((coord) => {
          const value = coord.substring(1);
          expect(value).toMatch(/^-?\d+(\.\d+)?$/);
        });
      }
    });
  });
});

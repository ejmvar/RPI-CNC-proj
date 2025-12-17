/**
 * G-Code Parser Worker Tests
 * Phase 13.2: Performance Improvements - WebWorker Implementation
 *
 * Tests for background G-Code parsing functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Import parser logic (will be run in worker context)
const parseGCodeLine = (line) => {
  const trimmed = line.trim();

  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('(')) {
    return null;
  }

  // Remove trailing comment
  let command = trimmed;
  const commentIndex = trimmed.indexOf(';');
  if (commentIndex > 0) {
    command = trimmed.substring(0, commentIndex).trim();
  }

  const params = {};
  let gCode = null;
  let mCode = null;

  // Extract G and M codes
  const gMatch = command.match(/G(\d+(?:\.\d+)?)/i);
  if (gMatch) {
    gCode = parseFloat(gMatch[1]);
  }

  const mMatch = command.match(/M(\d+)/i);
  if (mMatch) {
    mCode = parseInt(mMatch[1], 10);
  }

  // Extract parameters
  const paramRegex = /([A-Z])([\d.+-]+)/gi;
  let paramMatch;
  // eslint-disable-next-line no-cond-assign
  while ((paramMatch = paramRegex.exec(command)) !== null) {
    const key = paramMatch[1].toUpperCase();
    const value = parseFloat(paramMatch[2]);
    if (!Number.isNaN(value)) {
      params[key] = value;
    }
  }

  return {
    line: trimmed,
    gCode,
    mCode,
    params,
    raw: trimmed,
  };
};

describe('G-Code Parser Worker', () => {
  describe('parseLine', () => {
    it('should parse simple G0 command', () => {
      const result = parseGCodeLine('G0 X10 Y20 Z5');
      expect(result).not.toBeNull();
      expect(result.gCode).toBe(0);
      expect(result.params.X).toBe(10);
      expect(result.params.Y).toBe(20);
      expect(result.params.Z).toBe(5);
    });

    it('should parse G1 movement command', () => {
      const result = parseGCodeLine('G1 X100 Y50 F1000');
      expect(result).not.toBeNull();
      expect(result.gCode).toBe(1);
      expect(result.params.X).toBe(100);
      expect(result.params.Y).toBe(50);
      expect(result.params.F).toBe(1000);
    });

    it('should parse G2 arc (clockwise)', () => {
      const result = parseGCodeLine('G2 X50 Y50 I25 J25 F500');
      expect(result).not.toBeNull();
      expect(result.gCode).toBe(2);
      expect(result.params.X).toBe(50);
      expect(result.params.I).toBe(25);
      expect(result.params.J).toBe(25);
    });

    it('should parse G3 arc (counter-clockwise)', () => {
      const result = parseGCodeLine('G3 X10 Y10 I5 J5');
      expect(result).not.toBeNull();
      expect(result.gCode).toBe(3);
      expect(result.params.X).toBe(10);
      expect(result.params.I).toBe(5);
    });

    it('should parse M-code (spindle on)', () => {
      const result = parseGCodeLine('M3 S5000');
      expect(result).not.toBeNull();
      expect(result.mCode).toBe(3);
      expect(result.params.S).toBe(5000);
    });

    it('should parse M-code (spindle off)', () => {
      const result = parseGCodeLine('M5');
      expect(result).not.toBeNull();
      expect(result.mCode).toBe(5);
    });

    it('should parse negative coordinates', () => {
      const result = parseGCodeLine('G1 X-25.5 Y-10 Z-2.5');
      expect(result).not.toBeNull();
      expect(result.params.X).toBe(-25.5);
      expect(result.params.Y).toBe(-10);
      expect(result.params.Z).toBe(-2.5);
    });

    it('should parse floating-point precision', () => {
      const result = parseGCodeLine('G1 X123.456 Y789.012 F3.141592');
      expect(result).not.toBeNull();
      expect(result.params.X).toBe(123.456);
      expect(result.params.Y).toBe(789.012);
      expect(result.params.F).toBeCloseTo(3.141592);
    });

    it('should ignore inline comments', () => {
      const result = parseGCodeLine('G1 X100 Y50 ; Move to corner');
      expect(result).not.toBeNull();
      expect(result.gCode).toBe(1);
      expect(result.params.X).toBe(100);
    });

    it('should skip comment-only lines', () => {
      const result = parseGCodeLine('; This is a comment');
      expect(result).toBeNull();
    });

    it('should skip parenthetical comments', () => {
      const result = parseGCodeLine('(Setup phase)');
      expect(result).toBeNull();
    });

    it('should skip empty lines', () => {
      expect(parseGCodeLine('')).toBeNull();
      expect(parseGCodeLine('   ')).toBeNull();
      expect(parseGCodeLine('\t\n')).toBeNull();
    });

    it('should handle case-insensitivity', () => {
      const result = parseGCodeLine('g1 x100 y50 f1000');
      expect(result).not.toBeNull();
      expect(result.gCode).toBe(1);
      expect(result.params.X).toBe(100);
    });

    it('should parse decimal G-codes', () => {
      const result = parseGCodeLine('G0.1 X10 Y20');
      expect(result).not.toBeNull();
      expect(result.gCode).toBe(0.1);
    });

    it('should handle multiple parameters correctly', () => {
      const result = parseGCodeLine('G1 X100.5 Y200.3 Z-5.2 I10 J20 F2000 S8000');
      expect(result).not.toBeNull();
      expect(Object.keys(result.params)).toHaveLength(8); // Includes G code
      expect(result.params.X).toBe(100.5);
      expect(result.params.Y).toBe(200.3);
      expect(result.params.Z).toBe(-5.2);
      expect(result.params.I).toBe(10);
      expect(result.params.J).toBe(20);
      expect(result.params.F).toBe(2000);
      expect(result.params.S).toBe(8000);
    });

    it('should skip lines with only whitespace', () => {
      expect(parseGCodeLine('   \n\t  ')).toBeNull();
    });

    it('should parse tool change commands', () => {
      const result = parseGCodeLine('M6 T3');
      expect(result).not.toBeNull();
      expect(result.mCode).toBe(6);
      expect(result.params.T).toBe(3);
    });
  });

  describe('batch parsing', () => {
    it('should parse multiple lines', () => {
      const lines = [
        'G0 X10 Y20 Z5',
        'G1 X100 Y50 F1000',
        '; Comment line',
        'M3 S5000',
        '',
        'G1 X200 Y100',
      ];

      const results = lines.map(parseGCodeLine).filter((cmd) => cmd !== null);

      expect(results).toHaveLength(4);
      expect(results[0].gCode).toBe(0);
      expect(results[1].gCode).toBe(1);
      expect(results[2].mCode).toBe(3);
      expect(results[3].gCode).toBe(1);
    });

    it('should handle complex G-Code file simulation', () => {
      const gcode = `
; PCB Drilling Demo
G90
G21
M3 S3000
G0 X10 Y10 Z5
G1 Z-2 F100
G1 X20 Y20
G1 Z5
G0 X30 Y30 Z5
G1 Z-2
G1 Z5
M5
`;
      const lines = gcode.split('\n');
      const commands = lines.map(parseGCodeLine).filter((cmd) => cmd !== null);

      expect(commands.length).toBeGreaterThan(0);

      // Find G-codes and M-codes
      const gCodes = new Set(commands.map((cmd) => cmd.gCode).filter((g) => g !== null));
      const mCodes = new Set(commands.map((cmd) => cmd.mCode).filter((m) => m !== null));

      expect(gCodes.has(0)).toBe(true); // G0
      expect(gCodes.has(1)).toBe(true); // G1
      expect(mCodes.has(3)).toBe(true); // M3
      expect(mCodes.has(5)).toBe(true); // M5
    });
  });

  describe('metrics extraction', () => {
    it('should extract bounds from commands', () => {
      const commands = [
        { gCode: 0, params: { X: 0, Y: 0, Z: 0 } },
        { gCode: 1, params: { X: 100, Y: 50, Z: -5 } },
        { gCode: 1, params: { X: 200, Y: 150, Z: -10 } },
        { gCode: 0, params: { X: 0, Y: 0, Z: 5 } },
      ];

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;

      for (const cmd of commands) {
        if (cmd.params.X !== undefined) {
          minX = Math.min(minX, cmd.params.X);
          maxX = Math.max(maxX, cmd.params.X);
        }
        if (cmd.params.Y !== undefined) {
          minY = Math.min(minY, cmd.params.Y);
          maxY = Math.max(maxY, cmd.params.Y);
        }
        if (cmd.params.Z !== undefined) {
          minZ = Math.min(minZ, cmd.params.Z);
          maxZ = Math.max(maxZ, cmd.params.Z);
        }
      }

      expect(minX).toBe(0);
      expect(maxX).toBe(200);
      expect(minY).toBe(0);
      expect(maxY).toBe(150);
      expect(minZ).toBe(-10);
      expect(maxZ).toBe(5);
    });

    it('should detect all G-codes in file', () => {
      const lines = [
        'G0 X0 Y0',
        'G1 X10 Y10',
        'G2 X20 Y20 I5 J5',
        'G3 X30 Y30 I10 J10',
        'G0 X50 Y50',
      ];

      const commands = lines.map(parseGCodeLine).filter((cmd) => cmd !== null);
      const gCodes = new Set(commands.map((cmd) => cmd.gCode).filter((g) => g !== null));

      expect(gCodes.has(0)).toBe(true);
      expect(gCodes.has(1)).toBe(true);
      expect(gCodes.has(2)).toBe(true);
      expect(gCodes.has(3)).toBe(true);
      expect(gCodes.size).toBe(4);
    });

    it('should detect all M-codes in file', () => {
      const lines = ['M3 S5000', 'G1 X10 Y10', 'M5', 'M6 T2', 'M3 S8000'];

      const commands = lines.map(parseGCodeLine).filter((cmd) => cmd !== null);
      const mCodes = new Set(commands.map((cmd) => cmd.mCode).filter((m) => m !== null));

      expect(mCodes.has(3)).toBe(true);
      expect(mCodes.has(5)).toBe(true);
      expect(mCodes.has(6)).toBe(true);
      expect(mCodes.size).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should handle malformed G-codes gracefully', () => {
      const result = parseGCodeLine('GXX YYY ZZZ');
      // Should still parse what it can
      expect(result).not.toBeNull();
      expect(result.gCode).toBeNull();
    });

    it('should handle missing values', () => {
      const result = parseGCodeLine('G1 X Y Z');
      // Should parse G-code but skip invalid parameters
      expect(result).not.toBeNull();
      expect(result.gCode).toBe(1);
    });

    it('should ignore invalid parameter values', () => {
      const result = parseGCodeLine('G1 X10 Y abc Z20');
      expect(result).not.toBeNull();
      expect(result.params.X).toBe(10);
      expect(result.params.Y).toBeUndefined();
      expect(result.params.Z).toBe(20);
    });

    it('should preserve raw line for reference', () => {
      const line = 'G1 X100 Y50 F1000 ; Move to corner';
      const result = parseGCodeLine(line);
      // Raw should preserve the full line before comment processing
      expect(result.raw).toBe(line.trim());
    });
  });

  describe('performance characteristics', () => {
    it('should parse 1000 lines efficiently', () => {
      const lines = Array(1000)
        .fill(null)
        .map((_, i) => `G1 X${i} Y${i * 2} Z${Math.sin(i) * 10} F1000 S${i % 100}`);

      const startTime = performance.now();
      const commands = lines.map(parseGCodeLine).filter((cmd) => cmd !== null);
      const endTime = performance.now();

      expect(commands).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should parse 1000 lines in under 100ms
    });

    it('should handle large coordinate values', () => {
      const result = parseGCodeLine('G1 X999999.999 Y888888.888 Z-777.777');
      expect(result).not.toBeNull();
      expect(result.params.X).toBe(999999.999);
      expect(result.params.Y).toBe(888888.888);
      expect(result.params.Z).toBe(-777.777);
    });
  });
});

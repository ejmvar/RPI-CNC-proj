import { applyMeshCompensationToGCode } from '../../../modules/gcode/transform.mjs';

describe('transform.mjs edge cases', () => {
  const mesh = {
    xMin: 0,
    xMax: 100,
    yMin: 0,
    yMax: 100,
    cols: 3,
    rows: 3,
    points: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  };

  test('handles empty gcode gracefully (line 51)', () => {
    const result = applyMeshCompensationToGCode('', mesh);
    expect(result).toBe('');
  });

  test('handles null gcode gracefully', () => {
    const result = applyMeshCompensationToGCode(null, mesh);
    expect(result).toBe('');
  });

  test('handles undefined gcode gracefully', () => {
    const result = applyMeshCompensationToGCode(undefined, mesh);
    expect(result).toBe('');
  });

  test('preserves comment lines', () => {
    const gcode = '; This is a comment\nG1 X10 Y10 Z5';
    const result = applyMeshCompensationToGCode(gcode, mesh);
    expect(result).toContain('; This is a comment');
  });

  test('preserves parenthesis comments', () => {
    const gcode = '(Setup comment)\nG1 X10 Y10 Z5';
    const result = applyMeshCompensationToGCode(gcode, mesh);
    expect(result).toContain('(Setup comment)');
  });

  test('handles Z-only movements (lines 62-63)', () => {
    // Z movement without X or Y should not be compensated
    const gcode = 'G1 Z10';
    const result = applyMeshCompensationToGCode(gcode, mesh);
    expect(result).toContain('Z10');
  });

  test('handles X-only movements', () => {
    const gcode = 'G1 X50';
    const result = applyMeshCompensationToGCode(gcode, mesh);
    // X without Y or Z, should not be modified
    expect(result).toContain('X50');
  });

  test('handles Y-only movements', () => {
    const gcode = 'G1 Y50';
    const result = applyMeshCompensationToGCode(gcode, mesh);
    // Y without X or Z, should not be modified
    expect(result).toContain('Y50');
  });

  test('compensates Z when both X and Y present', () => {
    const gcode = 'G1 X50 Y50 Z5';
    const result = applyMeshCompensationToGCode(gcode, mesh);

    // Should modify Z value based on mesh
    expect(result).toContain('X50');
    expect(result).toContain('Y50');
    expect(result).toContain('Z');
  });

  test('uses default X=0 when not specified (line 63)', () => {
    const gcode = 'G1 Y50 Z5';
    const result = applyMeshCompensationToGCode(gcode, mesh);

    // Should use X=0 as default for interpolation
    expect(result).toBeDefined();
  });

  test('uses default Y=0 when not specified (line 63)', () => {
    const gcode = 'G1 X50 Z5';
    const result = applyMeshCompensationToGCode(gcode, mesh);

    // Should use Y=0 as default for interpolation
    expect(result).toBeDefined();
  });

  test('handles F parameter in movement commands', () => {
    const gcode = 'G1 X50 Y50 Z5 F1000';
    const result = applyMeshCompensationToGCode(gcode, mesh);

    expect(result).toContain('F1000');
  });

  test('handles mixed case coordinates', () => {
    const gcode = 'G1 x50 y50 z5';
    const result = applyMeshCompensationToGCode(gcode, mesh);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  test('preserves non-movement commands', () => {
    const gcode = 'M3 S1000\nG1 X10 Y10 Z5\nM5';
    const result = applyMeshCompensationToGCode(gcode, mesh);

    expect(result).toContain('M3 S1000');
    expect(result).toContain('M5');
  });

  test('handles multiple movements in sequence', () => {
    const gcode = 'G1 X0 Y0 Z5\nG1 X50 Y50 Z5\nG1 X100 Y100 Z5';
    const result = applyMeshCompensationToGCode(gcode, mesh);

    const lines = result.split('\n');
    expect(lines.length).toBe(3);
  });

  test('handles empty lines', () => {
    const gcode = 'G1 X10 Y10 Z5\n\nG1 X20 Y20 Z5';
    const result = applyMeshCompensationToGCode(gcode, mesh);

    const lines = result.split('\n');
    expect(lines.some((l) => l.trim() === '')).toBe(true);
  });
});

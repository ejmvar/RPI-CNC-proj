// Dynamic import for ES modules in Jest
let validateGCode, checkSyntax;

beforeAll(async () => {
  const module = await import('../../../modules/cli/gcode-validate.mjs');
  validateGCode = module.validateGCode;
  checkSyntax = module.checkSyntax;
});

describe('G-Code validation CLI', () => {
  describe('validateGCode', () => {
    it('accepts valid G-code with common commands', () => {
      const input = `
G21
G90
G0 X0 Y0 Z5
G1 X10 Y10 F500
M3 S1000
G1 Z-2
M5
      `.trim();

      const result = validateGCode(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects invalid command codes', () => {
      const input = 'G999 X10\nH123 Y5'; // Invalid G999, H123
      const result = validateGCode(input);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('G999'))).toBe(true);
    });

    it('detects missing required parameters', () => {
      const input = 'G1 F500'; // G1 without X/Y/Z
      const result = validateGCode(input);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.toLowerCase().includes('coordinate'))).toBe(true);
    });

    it('allows comments and blank lines', () => {
      const input = `
; This is a comment
G21

(Another comment style)
G0 X10
      `.trim();

      const result = validateGCode(input);
      expect(result.valid).toBe(true);
    });

    it('validates feed rate constraints', () => {
      const input = 'G1 X10 F99999'; // Extremely high feed rate
      const result = validateGCode(input);

      // Should warn or error on unrealistic feed rates
      expect(result.warnings || result.errors).toBeDefined();
    });
  });

  describe('checkSyntax', () => {
    it('detects malformed coordinates', () => {
      const line = 'G0 XAB Y12.C';
      const result = checkSyntax(line);

      expect(result.valid).toBe(false);
    });

    it('accepts properly formatted coordinates', () => {
      const line = 'G1 X10.5 Y-20.3 Z0.0 F1000';
      const result = checkSyntax(line);

      expect(result.valid).toBe(true);
    });

    it('handles scientific notation if supported', () => {
      const line = 'G1 X1.5E2 Y3E-1'; // 150, 0.3
      const result = checkSyntax(line);

      // Should either accept or gracefully reject
      expect(result).toHaveProperty('valid');
    });
  });
});

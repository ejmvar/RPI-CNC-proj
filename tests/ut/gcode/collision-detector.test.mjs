/**
 * Unit tests for collision-detector.mjs
 */

import {
  detectCollisions,
  getSummaryText,
  SEVERITY,
  WARNING_TYPE,
  DEFAULT_CONFIG,
} from '../../../modules/gcode/collision-detector.mjs';

describe('Collision Detector', () => {
  describe('detectCollisions', () => {
    test('handles empty input', () => {
      const result = detectCollisions('');
      expect(result.warnings).toHaveLength(0);
      expect(result.safe).toBe(true);
      expect(result.summary.total).toBe(0);
    });

    test('handles null input', () => {
      const result = detectCollisions(null);
      expect(result.warnings).toHaveLength(0);
      expect(result.safe).toBe(true);
    });

    test('detects X bounds violation', () => {
      const gcode = `G0 X250 Y50`;
      const result = detectCollisions(gcode);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].type).toBe(WARNING_TYPE.BOUNDS_X);
      expect(result.warnings[0].severity).toBe(SEVERITY.CRITICAL);
      expect(result.safe).toBe(false);
    });

    test('detects Y bounds violation', () => {
      const gcode = `G0 X50 Y250`;
      const result = detectCollisions(gcode);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].type).toBe(WARNING_TYPE.BOUNDS_Y);
      expect(result.warnings[0].severity).toBe(SEVERITY.CRITICAL);
      expect(result.safe).toBe(false);
    });

    test('detects Z bounds violation (too high)', () => {
      const gcode = `G0 Z100`;
      const result = detectCollisions(gcode);

      expect(result.warnings.length).toBeGreaterThan(0);
      const zWarning = result.warnings.find((w) => w.type === WARNING_TYPE.BOUNDS_Z);
      expect(zWarning).toBeDefined();
      expect(zWarning.severity).toBe(SEVERITY.CRITICAL);
      expect(result.safe).toBe(false);
    });

    test('detects Z bounds violation (too low)', () => {
      const gcode = `G0 Z-100`;
      const result = detectCollisions(gcode);

      expect(result.warnings.length).toBeGreaterThan(0);
      const zWarning = result.warnings.find((w) => w.type === WARNING_TYPE.BOUNDS_Z);
      expect(zWarning).toBeDefined();
      expect(result.safe).toBe(false);
    });

    test('detects rapid plunge', () => {
      const gcode = `G0 Z10
G0 Z-20`;
      const result = detectCollisions(gcode);

      expect(result.warnings.length).toBeGreaterThan(0);
      const plungeWarning = result.warnings.find((w) => w.type === WARNING_TYPE.RAPID_PLUNGE);
      expect(plungeWarning).toBeDefined();
      expect(plungeWarning.severity).toBe(SEVERITY.ERROR);
      expect(plungeWarning.delta).toBeGreaterThan(10);
    });

    test('allows safe rapid Z moves', () => {
      const gcode = `G0 Z10
G0 Z5`;
      const result = detectCollisions(gcode);

      const plungeWarning = result.warnings.find((w) => w.type === WARNING_TYPE.RAPID_PLUNGE);
      expect(plungeWarning).toBeUndefined();
    });

    test('detects negative Z rapid move', () => {
      const gcode = `G0 X50 Y50 Z-5`;
      const result = detectCollisions(gcode);

      const negZWarning = result.warnings.find((w) => w.type === WARNING_TYPE.NEGATIVE_Z_RAPID);
      expect(negZWarning).toBeDefined();
      expect(negZWarning.severity).toBe(SEVERITY.WARNING);
    });

    test('detects missing feed rate', () => {
      const gcode = `G1 X10 Y10`;
      const result = detectCollisions(gcode);

      const feedWarning = result.warnings.find((w) => w.type === WARNING_TYPE.FEED_RATE_MISSING);
      expect(feedWarning).toBeDefined();
      expect(feedWarning.severity).toBe(SEVERITY.WARNING);
    });

    test('detects excessive feed rate', () => {
      const gcode = `G1 X10 Y10 F5000`;
      const result = detectCollisions(gcode);

      const feedWarning = result.warnings.find((w) => w.type === WARNING_TYPE.FEED_RATE_HIGH);
      expect(feedWarning).toBeDefined();
      expect(feedWarning.severity).toBe(SEVERITY.ERROR);
      expect(feedWarning.value).toBe(5000);
    });

    test('allows valid feed rate', () => {
      const gcode = `G1 X10 Y10 F1000`;
      const result = detectCollisions(gcode);

      const feedWarning = result.warnings.find((w) => w.type === WARNING_TYPE.FEED_RATE_HIGH);
      expect(feedWarning).toBeUndefined();
    });

    test('detects excessive spindle speed', () => {
      const gcode = `M3 S30000
G1 X10 Y10 F1000`;
      const result = detectCollisions(gcode);

      const spindleWarning = result.warnings.find(
        (w) => w.type === WARNING_TYPE.SPINDLE_SPEED_HIGH
      );
      expect(spindleWarning).toBeDefined();
      expect(spindleWarning.severity).toBe(SEVERITY.ERROR);
      expect(spindleWarning.value).toBe(30000);
    });

    test('allows valid spindle speed', () => {
      const gcode = `M3 S12000
G1 X10 Y10 F1000`;
      const result = detectCollisions(gcode);

      const spindleWarning = result.warnings.find(
        (w) => w.type === WARNING_TYPE.SPINDLE_SPEED_HIGH
      );
      expect(spindleWarning).toBeUndefined();
    });

    test('respects custom machine bounds', () => {
      const gcode = `G0 X150 Y150`;
      const config = {
        xMin: 0,
        xMax: 100,
        yMin: 0,
        yMax: 100,
      };
      const result = detectCollisions(gcode, config);

      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
      expect(result.warnings.some((w) => w.type === WARNING_TYPE.BOUNDS_X)).toBe(true);
      expect(result.warnings.some((w) => w.type === WARNING_TYPE.BOUNDS_Y)).toBe(true);
    });

    test('respects custom feed rate limit', () => {
      const gcode = `G1 X10 Y10 F2000`;
      const config = { maxFeedRate: 1500 };
      const result = detectCollisions(gcode, config);

      const feedWarning = result.warnings.find((w) => w.type === WARNING_TYPE.FEED_RATE_HIGH);
      expect(feedWarning).toBeDefined();
    });

    test('detects multiple violations', () => {
      const gcode = `G0 X250 Y250 Z100
G1 X300 Y300 F5000`;
      const result = detectCollisions(gcode);

      expect(result.warnings.length).toBeGreaterThan(3);
      expect(result.safe).toBe(false);
    });

    test('safe G-Code passes all checks', () => {
      const gcode = `G0 X50 Y50 Z10
G1 Z1 F500
G1 X100 Y100 F1000
G0 Z10`;
      const result = detectCollisions(gcode);

      expect(result.safe).toBe(true);
      expect(result.summary.critical).toBe(0);
      expect(result.summary.error).toBe(0);
    });

    test('tracks position correctly across multiple moves', () => {
      const gcode = `G0 X10 Y10
G0 X20 Y20
G0 X250 Y30`;
      const result = detectCollisions(gcode);

      const xWarning = result.warnings.find((w) => w.type === WARNING_TYPE.BOUNDS_X);
      expect(xWarning).toBeDefined();
      expect(xWarning.position.x).toBe(250);
    });

    test('handles arc commands (G2/G3)', () => {
      const gcode = `G1 X10 Y10 F1000
G2 X20 Y10 I5 J0 F1000`;
      const result = detectCollisions(gcode);

      // Should not crash, arcs treated as movement
      expect(result).toBeDefined();
    });

    test('summary counts warnings by severity', () => {
      const gcode = `G0 X250 Y250 Z100
G1 X10 Y10 F5000
G1 X20 Y20`;
      const result = detectCollisions(gcode);

      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.summary.critical).toBeGreaterThan(0);
      expect(result.summary.error).toBeGreaterThan(0);
      // Note: warnings depend on specific violations detected
    });

    test('tracks feed rate across commands', () => {
      const gcode = `G1 X10 Y10 F1000
G1 X20 Y20
G1 X30 Y30`;
      const result = detectCollisions(gcode);

      // First move sets F1000, subsequent moves inherit it (no missing feed rate warnings)
      const feedWarnings = result.warnings.filter((w) => w.type === WARNING_TYPE.FEED_RATE_MISSING);
      expect(feedWarnings.length).toBe(0);
    });

    test('detects workpiece collision when spindle running', () => {
      const gcode = `M3 S12000
G0 X50 Y50 Z3
G1 X50 Y50 F1000`;
      const config = {
        workpieceX: 50,
        workpieceY: 50,
        workpieceZ: 0,
        workpieceWidth: 20,
        workpieceDepth: 20,
        workpieceHeight: 25,
        minSafeZ: 5,
        toolDiameter: 6,
      };
      const result = detectCollisions(gcode, config);

      const collisionWarning = result.warnings.find(
        (w) => w.type === WARNING_TYPE.WORKPIECE_COLLISION
      );
      expect(collisionWarning).toBeDefined();
    });

    test('no workpiece collision when spindle off', () => {
      const gcode = `G0 X50 Y50 Z6
G1 X50 Y50 F1000`;
      const result = detectCollisions(gcode);

      const collisionWarning = result.warnings.find(
        (w) => w.type === WARNING_TYPE.WORKPIECE_COLLISION
      );
      expect(collisionWarning).toBeUndefined();
    });
  });

  describe('getSummaryText', () => {
    test('returns success message for safe G-Code', () => {
      const result = {
        warnings: [],
        summary: { total: 0, critical: 0, error: 0, warning: 0, info: 0 },
        safe: true,
      };
      const text = getSummaryText(result);
      expect(text).toContain('✅');
      expect(text).toContain('safe');
    });

    test('includes critical warnings in summary', () => {
      const result = {
        warnings: [{ severity: SEVERITY.CRITICAL }],
        summary: { total: 1, critical: 1, error: 0, warning: 0, info: 0 },
        safe: false,
      };
      const text = getSummaryText(result);
      expect(text).toContain('CRITICAL');
      expect(text).toContain('1');
    });

    test('includes error warnings in summary', () => {
      const result = {
        warnings: [{ severity: SEVERITY.ERROR }],
        summary: { total: 1, critical: 0, error: 1, warning: 0, info: 0 },
        safe: false,
      };
      const text = getSummaryText(result);
      expect(text).toContain('ERROR');
    });

    test('includes warning level in summary', () => {
      const result = {
        warnings: [{ severity: SEVERITY.WARNING }],
        summary: { total: 1, critical: 0, error: 0, warning: 1, info: 0 },
        safe: true,
      };
      const text = getSummaryText(result);
      expect(text).toContain('WARNING');
    });

    test('handles multiple severity levels', () => {
      const result = {
        warnings: [],
        summary: { total: 5, critical: 1, error: 2, warning: 2, info: 0 },
        safe: false,
      };
      const text = getSummaryText(result);
      expect(text).toContain('CRITICAL');
      expect(text).toContain('ERROR');
      expect(text).toContain('WARNING');
    });
  });

  describe('DEFAULT_CONFIG', () => {
    test('has all required properties', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('xMin');
      expect(DEFAULT_CONFIG).toHaveProperty('xMax');
      expect(DEFAULT_CONFIG).toHaveProperty('yMin');
      expect(DEFAULT_CONFIG).toHaveProperty('yMax');
      expect(DEFAULT_CONFIG).toHaveProperty('zMin');
      expect(DEFAULT_CONFIG).toHaveProperty('zMax');
      expect(DEFAULT_CONFIG).toHaveProperty('maxFeedRate');
      expect(DEFAULT_CONFIG).toHaveProperty('maxSpindleSpeed');
      expect(DEFAULT_CONFIG).toHaveProperty('maxRapidPlunge');
      expect(DEFAULT_CONFIG).toHaveProperty('minSafeZ');
    });

    test('has sensible default values', () => {
      expect(DEFAULT_CONFIG.xMax).toBeGreaterThan(DEFAULT_CONFIG.xMin);
      expect(DEFAULT_CONFIG.yMax).toBeGreaterThan(DEFAULT_CONFIG.yMin);
      expect(DEFAULT_CONFIG.zMax).toBeGreaterThan(DEFAULT_CONFIG.zMin);
      expect(DEFAULT_CONFIG.maxFeedRate).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.maxSpindleSpeed).toBeGreaterThan(0);
    });
  });
});

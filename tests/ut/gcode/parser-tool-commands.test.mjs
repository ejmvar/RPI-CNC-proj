// Unit tests for parser extensions (tool commands)

import { parseLine, parse } from '../../../modules/gcode/parser.mjs';

describe('G-Code parser - tool commands', () => {
  describe('T command (tool select)', () => {
    test('parses T0', () => {
      const result = parseLine('T0');
      expect(result.params.T).toBe(0);
      expect(result.toolSelect).toBe(0);
    });

    test('parses T1', () => {
      const result = parseLine('T1');
      expect(result.params.T).toBe(1);
      expect(result.toolSelect).toBe(1);
    });

    test('parses T with other commands', () => {
      const result = parseLine('T2 M6');
      expect(result.toolSelect).toBe(2);
      expect(result.toolChange).toBe(true);
    });
  });

  describe('M6 command (tool change)', () => {
    test('detects M6', () => {
      const result = parseLine('M6');
      expect(result.toolChange).toBe(true);
    });

    test('detects M6 with T command', () => {
      const result = parseLine('T1 M6');
      expect(result.toolChange).toBe(true);
      expect(result.toolSelect).toBe(1);
    });

    test('detects M6 in middle of line', () => {
      const result = parseLine('G0 X10 M6 Y20');
      expect(result.toolChange).toBe(true);
    });

    test('case insensitive', () => {
      const result = parseLine('m6');
      expect(result.toolChange).toBe(true);
    });
  });

  describe('G43 command (tool length offset)', () => {
    test('detects G43', () => {
      const result = parseLine('G43');
      expect(result.toolLengthOffset).toBe(true);
    });

    test('parses G43 with H parameter', () => {
      const result = parseLine('G43 H1');
      expect(result.toolLengthOffset).toBe(true);
      expect(result.toolOffsetIndex).toBe(1);
    });

    test('parses G43 H2 Z0', () => {
      const result = parseLine('G43 H2 Z0');
      expect(result.toolLengthOffset).toBe(true);
      expect(result.toolOffsetIndex).toBe(2);
      expect(result.params.Z).toBe(0);
    });

    test('case insensitive', () => {
      const result = parseLine('g43 h3');
      expect(result.toolLengthOffset).toBe(true);
      expect(result.toolOffsetIndex).toBe(3);
    });
  });

  describe('G49 command (cancel tool offset)', () => {
    test('detects G49', () => {
      const result = parseLine('G49');
      expect(result.cancelToolOffset).toBe(true);
    });

    test('case insensitive', () => {
      const result = parseLine('g49');
      expect(result.cancelToolOffset).toBe(true);
    });
  });

  describe('Multi-line parsing with tools', () => {
    test('parses multi-tool G-Code', () => {
      const gcode = `
T0
G0 X10 Y10
T1 M6
G43 H1
G1 X20 Y20 Z-5
G49
`;
      const commands = parse(gcode);

      expect(commands[0].toolSelect).toBe(0);
      expect(commands[2].toolSelect).toBe(1);
      expect(commands[2].toolChange).toBe(true);
      expect(commands[3].toolLengthOffset).toBe(true);
      expect(commands[5].cancelToolOffset).toBe(true);
    });
  });

  describe('Backward compatibility', () => {
    test('parses G-Code without tool commands', () => {
      const result = parseLine('G1 X10 Y20 Z5 F100');
      expect(result.params.G).toBe(1);
      expect(result.params.X).toBe(10);
      expect(result.params.Y).toBe(20);
      expect(result.params.Z).toBe(5);
      expect(result.params.F).toBe(100);
      expect(result.toolSelect).toBeUndefined();
      expect(result.toolChange).toBeUndefined();
    });

    test('ignores comments', () => {
      const result = parseLine('; T0 M6 tool change');
      expect(result).toBeNull();
    });
  });
});

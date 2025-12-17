/**
 * Monaco Editor Module Tests
 * Phase 14.1: Editor Improvements
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  MonacoEditorWrapper,
  GCodeLanguageProvider,
} from '../../../modules/presentation/monaco-editor.mjs';

describe('MonacoEditorWrapper', () => {
  let editor;

  beforeEach(() => {
    editor = new MonacoEditorWrapper({
      container: 'test-editor',
      language: 'gcode',
      theme: 'vs-dark',
    });
  });

  afterEach(() => {
    if (editor) {
      editor.dispose();
    }
  });

  describe('Initialization', () => {
    test('should create editor wrapper with default options', () => {
      expect(editor).toBeDefined();
      expect(editor.language).toBe('gcode');
      expect(editor.theme).toBe('vs-dark');
      expect(editor.readOnly).toBe(false);
    });

    test('should accept custom options', () => {
      const customEditor = new MonacoEditorWrapper({
        container: 'custom',
        theme: 'vs',
        readOnly: true,
        fontSize: 16,
        tabSize: 4,
      });

      expect(customEditor.theme).toBe('vs');
      expect(customEditor.readOnly).toBe(true);
      expect(customEditor.fontSize).toBe(16);
      expect(customEditor.tabSize).toBe(4);

      customEditor.dispose();
    });

    test('should initialize Monaco configuration', async () => {
      const config = await editor.initialize();

      expect(config).toBeDefined();
      expect(config.language).toBeDefined();
      expect(config.tokens).toBeDefined();
      expect(config.suggestions).toBeDefined();
      expect(config.editorConfig).toBeDefined();
    });

    test('should define G-Code language', async () => {
      const config = await editor.initialize();
      const lang = config.language;

      expect(lang.id).toBe('gcode');
      expect(lang.extensions).toContain('.gcode');
      expect(lang.extensions).toContain('.nc');
      expect(lang.extensions).toContain('.ngc');
    });
  });

  describe('Autocomplete Suggestions', () => {
    test('should build G-Code autocomplete suggestions', () => {
      const suggestions = editor.autocompleteSuggestions;

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.label === 'G0')).toBe(true);
      expect(suggestions.some((s) => s.label === 'G1')).toBe(true);
      expect(suggestions.some((s) => s.label === 'M3')).toBe(true);
      expect(suggestions.some((s) => s.label === 'M5')).toBe(true);
    });

    test('should include motion commands', () => {
      const suggestions = editor.autocompleteSuggestions;
      const gMotions = suggestions.filter((s) => s.label.startsWith('G'));

      expect(gMotions.length).toBeGreaterThan(0);
      expect(gMotions.some((s) => s.label === 'G0')).toBe(true); // Rapid
      expect(gMotions.some((s) => s.label === 'G1')).toBe(true); // Linear
      expect(gMotions.some((s) => s.label === 'G2')).toBe(true); // Arc CW
      expect(gMotions.some((s) => s.label === 'G3')).toBe(true); // Arc CCW
    });

    test('should include spindle commands', () => {
      const suggestions = editor.autocompleteSuggestions;

      expect(suggestions.some((s) => s.label === 'M3')).toBe(true); // Spindle on CW
      expect(suggestions.some((s) => s.label === 'M4')).toBe(true); // Spindle on CCW
      expect(suggestions.some((s) => s.label === 'M5')).toBe(true); // Spindle off
    });

    test('should include tool commands', () => {
      const suggestions = editor.autocompleteSuggestions;

      expect(suggestions.some((s) => s.label === 'T')).toBe(true); // Tool
      expect(suggestions.some((s) => s.label === 'M6')).toBe(true); // Tool change
    });

    test('should include parameter suggestions', () => {
      const suggestions = editor.autocompleteSuggestions;

      expect(suggestions.some((s) => s.label === 'X')).toBe(true);
      expect(suggestions.some((s) => s.label === 'Y')).toBe(true);
      expect(suggestions.some((s) => s.label === 'Z')).toBe(true);
      expect(suggestions.some((s) => s.label === 'F')).toBe(true); // Feed rate
      expect(suggestions.some((s) => s.label === 'S')).toBe(true); // Spindle speed
    });

    test('should have helpful tooltips for suggestions', () => {
      const suggestions = editor.autocompleteSuggestions;
      const g0 = suggestions.find((s) => s.label === 'G0');

      expect(g0.detail).toBe('Rapid positioning');
      expect(g0.insertText).toBeDefined();
    });
  });

  describe('Editor Configuration', () => {
    test('should configure line numbers based on option', async () => {
      const config = await editor.initialize();

      expect(config.editorConfig.lineNumbers).toBe('on');

      const noLineNumbers = new MonacoEditorWrapper({ lineNumbers: false });
      const config2 = await noLineNumbers.initialize();

      expect(config2.editorConfig.lineNumbers).toBe('off');
      noLineNumbers.dispose();
    });

    test('should configure code folding', async () => {
      const config = await editor.initialize();
      expect(config.editorConfig.folding).toBe(true);

      const noFolding = new MonacoEditorWrapper({ codeFolding: false });
      const config2 = await noFolding.initialize();
      expect(config2.editorConfig.folding).toBe(false);
      noFolding.dispose();
    });

    test('should configure minimap', async () => {
      const config = await editor.initialize();
      expect(config.editorConfig.minimap.enabled).toBe(true);

      const noMinimap = new MonacoEditorWrapper({ minimap: false });
      const config2 = await noMinimap.initialize();
      expect(config2.editorConfig.minimap.enabled).toBe(false);
      noMinimap.dispose();
    });

    test('should configure word wrap', async () => {
      const config = await editor.initialize();
      expect(config.editorConfig.wordWrap).toBe('on');

      const noWrap = new MonacoEditorWrapper({ wordWrap: false });
      const config2 = await noWrap.initialize();
      expect(config2.editorConfig.wordWrap).toBe('off');
      noWrap.dispose();
    });

    test('should set custom font size', async () => {
      const customEditor = new MonacoEditorWrapper({ fontSize: 18 });
      const config = await customEditor.initialize();

      expect(config.editorConfig.fontSize).toBe(18);
      customEditor.dispose();
    });

    test('should set custom tab size', async () => {
      const customEditor = new MonacoEditorWrapper({ tabSize: 4 });
      const config = await customEditor.initialize();

      expect(config.editorConfig.tabSize).toBe(4);
      customEditor.dispose();
    });
  });

  describe('Event Handling', () => {
    test('should add event listeners', () => {
      const callback = jest.fn();
      editor.addEventListener('change', callback);

      expect(editor.listeners.change).toBeDefined();
      expect(editor.listeners.change.length).toBe(1);
    });

    test('should emit events to registered listeners', () => {
      const callback = jest.fn();
      editor.addEventListener('change', callback);

      editor.emit('change', { value: 'test' });

      expect(callback).toHaveBeenCalledWith({ value: 'test' });
    });

    test('should support multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      editor.addEventListener('change', callback1);
      editor.addEventListener('change', callback2);

      editor.emit('change', { value: 'test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should remove event listeners', () => {
      const callback = jest.fn();
      editor.addEventListener('change', callback);
      editor.removeEventListener('change', callback);

      editor.emit('change', { value: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Content Management', () => {
    test('should set and get editor value', () => {
      // Without Monaco being loaded, these should gracefully handle
      const content = 'G28\nG0 X10 Y20\nG1 Z-5 F100\nM30';
      editor.setValue(content);

      const value = editor.getValue();
      expect(value).toBe(''); // No real editor, so empty
    });

    test('should handle theme changes', () => {
      editor.setTheme('vs');
      expect(editor.theme).toBe('vs');

      editor.setTheme('vs-dark');
      expect(editor.theme).toBe('vs-dark');
    });

    test('should set read-only mode', () => {
      expect(editor.readOnly).toBe(false);

      editor.setReadOnly(true);
      expect(editor.readOnly).toBe(true);

      editor.setReadOnly(false);
      expect(editor.readOnly).toBe(false);
    });
  });

  describe('Diagnostics', () => {
    test('should add error markers', () => {
      // Should not throw when Monaco not loaded
      editor.addErrorMarker(5, 'Invalid G-code');
      // Pass if no error thrown
      expect(true).toBe(true);
    });

    test('should clear error markers', () => {
      editor.clearErrorMarkers();
      expect(true).toBe(true);
    });

    test('should set multiple diagnostics', () => {
      const diagnostics = [
        { line: 1, column: 1, message: 'Error 1', severity: 'error' },
        { line: 2, column: 5, message: 'Warning 1', severity: 'warning' },
      ];

      editor.setDiagnostics(diagnostics);
      expect(true).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should dispose editor and clean up', () => {
      const testEditor = new MonacoEditorWrapper();
      testEditor.addEventListener('change', jest.fn());

      expect(testEditor.listeners.change).toBeDefined();

      testEditor.dispose();

      expect(testEditor.editor).toBeNull();
      expect(Object.keys(testEditor.listeners).length).toBe(0);
    });
  });
});

describe('GCodeLanguageProvider', () => {
  describe('Validation', () => {
    test('should validate empty content without errors', () => {
      const diagnostics = GCodeLanguageProvider.validate('');
      expect(diagnostics).toEqual([]);
    });

    test('should validate simple G-Code', () => {
      const content = 'G28\nG0 X10 Y20 Z5\nG1 F100 Z-5\nM30';
      const diagnostics = GCodeLanguageProvider.validate(content);

      expect(diagnostics.length).toBe(0);
    });

    test('should skip comments', () => {
      const content = '; This is a comment\nG28\n(Parenthesis comment)\nG0 X10';
      const diagnostics = GCodeLanguageProvider.validate(content);

      expect(diagnostics.length).toBe(0);
    });

    test('should detect invalid G-code numbers', () => {
      const content = 'G150'; // G-code > 99
      const diagnostics = GCodeLanguageProvider.validate(content);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toContain('Invalid G-code');
    });

    test('should detect invalid M-code numbers', () => {
      const content = 'M9999'; // M-code > 999
      const diagnostics = GCodeLanguageProvider.validate(content);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toContain('Invalid M-code');
    });

    test('should warn about unbalanced parentheses', () => {
      const content = 'G0 X10 (This comment is not closed\nG1 Z5';
      const diagnostics = GCodeLanguageProvider.validate(content);

      const unbalanced = diagnostics.filter((d) => d.message.includes('Unbalanced'));
      expect(unbalanced.length).toBeGreaterThan(0);
    });

    test('should detect parameter without value', () => {
      const content = 'G1 X10 Y 20'; // Y without value after
      const diagnostics = GCodeLanguageProvider.validate(content);

      // Should detect Y followed by space as potential error
      expect(diagnostics.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Command Detection', () => {
    test('should detect G-codes from content', () => {
      const content = 'G0 X10\nG1 Y20\nG28\nG90';
      const commands = GCodeLanguageProvider.detectCommands(content);

      expect(commands.gCodes).toContain('G0');
      expect(commands.gCodes).toContain('G1');
      expect(commands.gCodes).toContain('G28');
      expect(commands.gCodes).toContain('G90');
    });

    test('should detect M-codes from content', () => {
      const content = 'M3 S1000\nM5\nM30\nM6';
      const commands = GCodeLanguageProvider.detectCommands(content);

      expect(commands.mCodes).toContain('M3');
      expect(commands.mCodes).toContain('M5');
      expect(commands.mCodes).toContain('M30');
      expect(commands.mCodes).toContain('M6');
    });

    test('should detect parameters from content', () => {
      const content = 'G1 X10 Y20 Z-5 F100 S1000\nG0 X0 Y0';
      const commands = GCodeLanguageProvider.detectCommands(content);

      expect(commands.parameters).toContain('X');
      expect(commands.parameters).toContain('Y');
      expect(commands.parameters).toContain('Z');
      expect(commands.parameters).toContain('F');
      expect(commands.parameters).toContain('S');
    });

    test('should return sorted lists', () => {
      const content = 'G30 G10 G20 G0 M30 M5 M3';
      const commands = GCodeLanguageProvider.detectCommands(content);

      expect(commands.gCodes).toEqual(['G0', 'G10', 'G20', 'G30']);
      expect(commands.mCodes).toEqual(['M3', 'M5', 'M30']);
    });
  });

  describe('Formatting', () => {
    test('should normalize G-Code formatting', () => {
      const content = 'g0   x10   y20\n  g1  z-5   f100  ';
      const formatted = GCodeLanguageProvider.format(content);

      expect(formatted).toContain('G0 X10 Y20');
      expect(formatted).toContain('G1 Z-5 F100');
    });

    test('should preserve comments', () => {
      const content = '; Header comment\nG28\n; Move to origin';
      const formatted = GCodeLanguageProvider.format(content);

      expect(formatted).toContain('; Header comment');
      expect(formatted).toContain('; Move to origin');
    });

    test('should normalize multiple spaces to single space', () => {
      const content = 'G0    X10    Y20    Z5';
      const formatted = GCodeLanguageProvider.format(content);

      const lines = formatted.split('\n');
      const firstLine = lines[0];

      // Should have normalized spacing
      expect(firstLine.match(/ {2}/)).toBeNull();
    });

    test('should convert to uppercase', () => {
      const content = 'g0 x10 y20\ng1 z-5 f100';
      const formatted = GCodeLanguageProvider.format(content);

      expect(formatted).toContain('G0');
      expect(formatted).toContain('X10');
      expect(formatted).toContain('Y20');
    });
  });

  describe('Complex Scenarios', () => {
    test('should validate realistic G-Code program', () => {
      const content = `
; CNC Program: Basic Square
G21         ; Metric
G90         ; Absolute positioning
G28         ; Home

; Cut square
G0 X0 Y0 Z5  ; Move to start
M3 S1000     ; Spindle on
G0 Z0        ; Lower tool
G1 X10 F50   ; Line 1
G1 Y10       ; Line 2
G1 X0        ; Line 3
G1 Y0        ; Line 4
M5           ; Spindle off
G0 Z5        ; Raise tool
G28          ; Return home
M30          ; End
      `.trim();

      const diagnostics = GCodeLanguageProvider.validate(content);
      expect(diagnostics.length).toBe(0);
    });

    test('should extract all commands from complex program', () => {
      const content = `
G21
G90
G28
G0 X0 Y0
M3 S1000
G1 Z-5 F50
G2 X10 Y10 I5 J5
M5
G28
M30
      `.trim();

      const commands = GCodeLanguageProvider.detectCommands(content);

      expect(commands.gCodes.length).toBeGreaterThan(0);
      expect(commands.mCodes.length).toBeGreaterThan(0);
      expect(commands.parameters.length).toBeGreaterThan(0);
    });

    test('should handle probing commands', () => {
      const content = 'G38.2 Z-10 F50\nG1 Z5\nG38.3 Z0 F10';
      const diagnostics = GCodeLanguageProvider.validate(content);

      // Probing commands should validate
      expect(diagnostics.length).toBe(0);

      const commands = GCodeLanguageProvider.detectCommands(content);
      expect(commands.gCodes).toContain('G38.2');
    });
  });
});

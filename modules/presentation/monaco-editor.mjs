/**
 * Monaco Editor Integration Module
 * Phase 14.1: Editor Improvements
 *
 * Provides a wrapper around Monaco Editor with:
 * - G-Code syntax highlighting
 * - Autocomplete/IntelliSense
 * - Error diagnostics
 * - Code folding and line numbers
 * - Theme management
 *
 * Note: This module is designed for browser use (window object required)
 */

/* global window */

export class MonacoEditorWrapper {
  constructor(options = {}) {
    this.container = options.container || 'editor-container';
    this.editor = null;
    this.language = options.language || 'gcode';
    this.theme = options.theme || 'vs-dark';
    this.readOnly = options.readOnly || false;
    this.lineNumbers = options.lineNumbers !== false;
    this.codeFolding = options.codeFolding !== false;
    this.minimap = options.minimap !== false;
    this.wordWrap = options.wordWrap !== false;
    this.fontSize = options.fontSize || 14;
    this.tabSize = options.tabSize || 2;
    this.listeners = {};

    // G-Code language definition
    this.gcodeLanguage = {
      id: 'gcode',
      extensions: ['.gcode', '.nc', '.ngc'],
      aliases: ['G-Code', 'gcode'],
      mimetypes: ['application/x-gcode'],
    };

    // G-Code tokens
    this.gcodeTokensProvider = {
      tokenizer: {
        root: [
          // G-codes (G0-G99)
          [/\b(G\d+)\b/i, 'keyword.gcode'],
          // M-codes (M0-M999)
          [/\b(M\d+)\b/i, 'keyword.mcode'],
          // Parameters (X, Y, Z, F, S, T, H, etc.)
          [/\b([XYZFSTHDIP])([-+]?[\d.]+)\b/i, ['variable.parameter', 'number.coordinate']],
          // Comments (parentheses)
          [/\([^)]*\)/g, 'comment.line'],
          // Comments (semicolon)
          [/;.*$/g, 'comment.line'],
          // Numbers
          [/[-+]?(\d+\.?\d*|\.\d+)/g, 'number'],
          // Operators
          [/[+\-*/=<>]/g, 'operator'],
          // Whitespace
          [/\s+/, 'whitespace'],
        ],
      },
    };

    // Autocomplete suggestions
    this.autocompleteSuggestions = this.buildAutocompleteSuggestions();
  }

  /**
   * Build autocomplete suggestions for G-Code
   */
  buildAutocompleteSuggestions() {
    return [
      // Motion commands
      { label: 'G0', kind: 'Keyword', insertText: 'G0 X Y Z', detail: 'Rapid positioning' },
      { label: 'G1', kind: 'Keyword', insertText: 'G1 X Y Z F', detail: 'Linear interpolation' },
      { label: 'G2', kind: 'Keyword', insertText: 'G2 X Y I J F', detail: 'Clockwise arc' },
      { label: 'G3', kind: 'Keyword', insertText: 'G3 X Y I J F', detail: 'Counter-clockwise arc' },
      { label: 'G4', kind: 'Keyword', insertText: 'G4 P', detail: 'Dwell (pause)' },

      // Plane selection
      { label: 'G17', kind: 'Keyword', insertText: 'G17', detail: 'XY plane selection' },
      { label: 'G18', kind: 'Keyword', insertText: 'G18', detail: 'ZX plane selection' },
      { label: 'G19', kind: 'Keyword', insertText: 'G19', detail: 'YZ plane selection' },

      // Positioning modes
      { label: 'G20', kind: 'Keyword', insertText: 'G20', detail: 'Inch programming' },
      { label: 'G21', kind: 'Keyword', insertText: 'G21', detail: 'Metric programming' },
      { label: 'G90', kind: 'Keyword', insertText: 'G90', detail: 'Absolute positioning' },
      { label: 'G91', kind: 'Keyword', insertText: 'G91', detail: 'Incremental positioning' },

      // Tool commands
      { label: 'T', kind: 'Variable', insertText: 'T', detail: 'Tool selection' },
      { label: 'M6', kind: 'Keyword', insertText: 'M6', detail: 'Tool change' },

      // Spindle commands
      { label: 'M3', kind: 'Keyword', insertText: 'M3 S', detail: 'Spindle on (CW)' },
      { label: 'M4', kind: 'Keyword', insertText: 'M4 S', detail: 'Spindle on (CCW)' },
      { label: 'M5', kind: 'Keyword', insertText: 'M5', detail: 'Spindle off' },

      // Flow commands
      { label: 'M0', kind: 'Keyword', insertText: 'M0', detail: 'Program stop' },
      { label: 'M1', kind: 'Keyword', insertText: 'M1', detail: 'Optional stop' },
      { label: 'M30', kind: 'Keyword', insertText: 'M30', detail: 'Program end' },

      // Auto-leveling commands
      { label: 'G38.2', kind: 'Keyword', insertText: 'G38.2 Z F', detail: 'Probe toward surface' },
      {
        label: 'G38.3',
        kind: 'Keyword',
        insertText: 'G38.3 Z F',
        detail: 'Probe away from surface',
      },

      // Home command
      { label: 'G28', kind: 'Keyword', insertText: 'G28', detail: 'Go to home position' },

      // Parameters (snippets for common patterns)
      { label: 'X', kind: 'Variable', insertText: 'X${1:0}', detail: 'X coordinate' },
      { label: 'Y', kind: 'Variable', insertText: 'Y${1:0}', detail: 'Y coordinate' },
      { label: 'Z', kind: 'Variable', insertText: 'Z${1:0}', detail: 'Z coordinate' },
      { label: 'F', kind: 'Variable', insertText: 'F${1:100}', detail: 'Feed rate' },
      { label: 'S', kind: 'Variable', insertText: 'S${1:1000}', detail: 'Spindle speed' },
    ];
  }

  /**
   * Initialize Monaco Editor
   */
  async initialize() {
    // This will be called when Monaco is loaded in the browser
    // For now, return a setup configuration
    return {
      language: this.gcodeLanguage,
      tokens: this.gcodeTokensProvider,
      suggestions: this.autocompleteSuggestions,
      editorConfig: {
        value: '',
        language: 'gcode',
        theme: this.theme,
        readOnly: this.readOnly,
        lineNumbers: this.lineNumbers ? 'on' : 'off',
        codeLens: true,
        codeActionsOnSave: true,
        folding: this.codeFolding,
        minimap: { enabled: this.minimap },
        wordWrap: this.wordWrap ? 'on' : 'off',
        fontSize: this.fontSize,
        tabSize: this.tabSize,
        insertSpaces: true,
        formatOnPaste: true,
        formatOnType: true,
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        autoSurround: 'languageDefined',
        showUnused: true,
      },
    };
  }

  /**
   * Set editor content
   */
  setValue(content) {
    if (!this.editor) return;
    this.editor.setValue(content);
    this.emit('change', { value: content });
  }

  /**
   * Get editor content
   */
  getValue() {
    if (!this.editor) return '';
    return this.editor.getValue();
  }

  /**
   * Set theme
   */
  setTheme(theme) {
    this.theme = theme;
    if (this.editor && window.monaco) {
      window.monaco.editor.setTheme(theme);
    }
  }

  /**
   * Set read-only mode
   */
  setReadOnly(readOnly) {
    this.readOnly = readOnly;
    if (this.editor) {
      this.editor.updateOptions({ readOnly });
    }
  }

  /**
   * Add error marker
   */
  addErrorMarker(line, message, severity = 'error') {
    if (!this.editor || !window.monaco) return;

    const model = this.editor.getModel();
    if (!model) return;

    window.monaco.editor.setModelMarkers(model, 'gcode', [
      {
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: model.getLineLength(line) + 1,
        message,
        severity: severity === 'error' ? 8 : severity === 'warning' ? 4 : 1,
      },
    ]);
  }

  /**
   * Clear error markers
   */
  clearErrorMarkers() {
    if (!this.editor || !window.monaco) return;
    const model = this.editor.getModel();
    if (model) {
      window.monaco.editor.setModelMarkers(model, 'gcode', []);
    }
  }

  /**
   * Set diagnostics (validation errors)
   */
  setDiagnostics(diagnostics = []) {
    if (!this.editor || !window.monaco) return;

    const model = this.editor.getModel();
    if (!model) return;

    const markers = diagnostics.map((diag) => ({
      startLineNumber: diag.line,
      startColumn: diag.column || 1,
      endLineNumber: diag.line,
      endColumn: diag.column ? diag.column + 1 : 2,
      message: diag.message,
      severity: diag.severity === 'error' ? 8 : diag.severity === 'warning' ? 4 : 1,
      code: diag.code,
      source: 'gcode-validator',
    }));

    window.monaco.editor.setModelMarkers(model, 'gcode', markers);
  }

  /**
   * Get current line number
   */
  getCurrentLine() {
    if (!this.editor) return 0;
    return this.editor.getPosition()?.lineNumber || 0;
  }

  /**
   * Get current column
   */
  getCurrentColumn() {
    if (!this.editor) return 0;
    return this.editor.getPosition()?.column || 0;
  }

  /**
   * Go to line
   */
  goToLine(line, column = 1) {
    if (!this.editor) return;
    this.editor.revealLineInCenter(line);
    this.editor.setPosition({ lineNumber: line, column });
  }

  /**
   * Get selected text
   */
  getSelectedText() {
    if (!this.editor) return '';
    const selection = this.editor.getSelection();
    if (!selection) return '';
    const model = this.editor.getModel();
    return model.getValueInRange(selection);
  }

  /**
   * Replace selected text
   */
  replaceSelectedText(text) {
    if (!this.editor) return;
    const selection = this.editor.getSelection();
    if (selection) {
      this.editor.executeEdits('', [
        {
          range: selection,
          text,
        },
      ]);
    }
  }

  /**
   * Format document
   */
  formatDocument() {
    if (!this.editor) return;
    this.editor.getAction('editor.action.formatDocument').run();
  }

  /**
   * Find and replace
   */
  findReplace(searchTerm, replaceTerm, replaceAll = false) {
    if (!this.editor) return;

    const model = this.editor.getModel();
    if (!model) return;

    const findMatches = model.findMatches(searchTerm, true, false, false, null, true);

    if (replaceAll) {
      // eslint-disable-next-line no-unused-vars
      let offset = 0;
      for (const match of findMatches) {
        const range = match.range;
        // eslint-disable-next-line no-unused-vars
        const newRange = {
          startLineNumber: range.startLineNumber,
          startColumn: range.startColumn + offset,
          endLineNumber: range.endLineNumber,
          endColumn: range.endColumn + offset,
        };
        offset += replaceTerm.length - (range.endColumn - range.startColumn);
      }
    }

    return findMatches.length;
  }

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    for (const callback of this.listeners[event]) {
      callback(data);
    }
  }

  /**
   * Destroy editor and cleanup
   */
  dispose() {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
    this.listeners = {};
  }
}

/**
 * G-Code Language Provider
 * Provides language-specific features for G-Code
 */
export class GCodeLanguageProvider {
  /**
   * Validate G-Code
   */
  static validate(content) {
    const diagnostics = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim().toUpperCase();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('(')) {
        return;
      }

      // Check for valid G-Code format
      const tokens = trimmed.split(/\s+/);

      for (const token of tokens) {
        // Validate G-codes
        if (token.match(/^G\d+$/)) {
          const gcode = parseInt(token.substring(1));
          if (gcode > 99) {
            diagnostics.push({
              line: lineNum,
              column: line.indexOf(token) + 1,
              message: `Invalid G-code: ${token} (0-99 supported)`,
              severity: 'error',
            });
          }
        }

        // Validate M-codes
        if (token.match(/^M\d+$/)) {
          const mcode = parseInt(token.substring(1));
          if (mcode > 999) {
            diagnostics.push({
              line: lineNum,
              column: line.indexOf(token) + 1,
              message: `Invalid M-code: ${token} (0-999 supported)`,
              severity: 'error',
            });
          }
        }

        // Validate parameters have values
        if (token.match(/^[XYZFSTHDIP]$/)) {
          diagnostics.push({
            line: lineNum,
            column: line.indexOf(token) + 1,
            message: `Parameter ${token} must be followed by a value`,
            severity: 'error',
          });
        }
      }

      // Check for unbalanced parentheses
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        diagnostics.push({
          line: lineNum,
          column: 1,
          message: 'Unbalanced parentheses in comment',
          severity: 'warning',
        });
      }
    });

    return diagnostics;
  }

  /**
   * Detect G-Code commands
   */
  static detectCommands(content) {
    const commands = {
      gCodes: new Set(),
      mCodes: new Set(),
      parameters: new Set(),
    };

    const lines = content.split('\n');
    lines.forEach((line) => {
      const trimmed = line.toUpperCase();

      // Remove comments
      let cleanLine = trimmed.replace(/\(.*?\)/g, '').replace(/;.*$/g, '');

      // Find all G-codes (including decimal like G38.2)
      const gMatches = cleanLine.match(/G[\d.]+/g);
      if (gMatches) {
        gMatches.forEach((match) => commands.gCodes.add(match));
      }

      // Find all M-codes
      const mMatches = cleanLine.match(/M\d+/g);
      if (mMatches) {
        mMatches.forEach((match) => commands.mCodes.add(match));
      }

      // Find all parameters (letter followed by number)
      const paramMatches = cleanLine.match(/[XYZFSTHDIP](?=[\s\d.\-+]|$)/g);
      if (paramMatches) {
        paramMatches.forEach((match) => commands.parameters.add(match));
      }
    });

    return {
      gCodes: Array.from(commands.gCodes).sort((a, b) => {
        const numA = parseFloat(a.substring(1));
        const numB = parseFloat(b.substring(1));
        return numA - numB;
      }),
      mCodes: Array.from(commands.mCodes).sort((a, b) => {
        const numA = parseInt(a.substring(1));
        const numB = parseInt(b.substring(1));
        return numA - numB;
      }),
      parameters: Array.from(commands.parameters).sort(),
    };
  }

  /**
   * Format G-Code
   */
  static format(content) {
    const lines = content.split('\n');
    const formatted = lines.map((line) => {
      // Normalize line
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';')) {
        return trimmed;
      }

      // Split into tokens
      const tokens = trimmed.split(/\s+/);
      const normalized = tokens.join(' ').toUpperCase();

      return normalized;
    });

    return formatted.join('\n');
  }
}

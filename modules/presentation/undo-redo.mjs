/**
 * Undo/Redo System Module
 * Phase 14.2: Undo/Redo Implementation
 *
 * Implements the Command Pattern for undo/redo functionality:
 * - History stack management
 * - Command execution and rollback
 * - Transaction support
 * - State snapshots
 * - Event notifications
 */

/**
 * Command Interface - All commands must implement this pattern
 */
export class Command {
  /**
   * Execute the command
   * @returns {any} Result of execution
   */
  execute() {
    throw new Error('execute() must be implemented');
  }

  /**
   * Undo the command
   * @returns {any} Result of undo
   */
  undo() {
    throw new Error('undo() must be implemented');
  }

  /**
   * Get command description
   * @returns {string} Human-readable description
   */
  getDescription() {
    return this.constructor.name;
  }
}

/**
 * History Manager - Manages undo/redo stack
 */
export class HistoryManager {
  constructor(options = {}) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.listeners = {};
    this.isExecuting = false;
    this.inTransaction = false;
    this.transactionCommands = [];
  }

  /**
   * Execute a command and add to undo stack
   */
  execute(command) {
    if (!command || typeof command.execute !== 'function') {
      throw new Error('Command must have execute() method');
    }

    this.isExecuting = true;

    try {
      const result = command.execute();

      if (this.inTransaction) {
        // In transaction, accumulate commands
        this.transactionCommands.push(command);
      } else {
        // Add to undo stack
        this.undoStack.push(command);

        // Enforce max history size
        if (this.undoStack.length > this.maxHistorySize) {
          this.undoStack.shift();
        }

        // Clear redo stack
        this.redoStack = [];

        this.emit('commandExecuted', {
          command,
          canUndo: this.canUndo(),
          canRedo: this.canRedo(),
        });
      }

      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Undo last command
   */
  undo() {
    if (!this.canUndo()) {
      return null;
    }

    this.isExecuting = true;

    try {
      const command = this.undoStack.pop();
      const result = command.undo();

      this.redoStack.push(command);

      this.emit('commandUndone', {
        command,
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
      });

      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Redo last undone command
   */
  redo() {
    if (!this.canRedo()) {
      return null;
    }

    this.isExecuting = true;

    try {
      const command = this.redoStack.pop();
      const result = command.execute();

      this.undoStack.push(command);

      this.emit('commandRedone', {
        command,
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
      });

      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Begin a transaction (groups multiple commands)
   */
  beginTransaction() {
    this.inTransaction = true;
    this.transactionCommands = [];
  }

  /**
   * Commit a transaction (executes all accumulated commands as one)
   */
  commitTransaction(description = 'Transaction') {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }

    this.inTransaction = false;

    if (this.transactionCommands.length === 0) {
      return;
    }

    // Create a compound command
    const compoundCommand = new CompoundCommand(this.transactionCommands, description);

    // Clear accumulated commands
    this.transactionCommands = [];

    // Execute as single undo-able command
    this.undoStack.push(compoundCommand);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    this.redoStack = [];

    this.emit('transactionCommitted', {
      command: compoundCommand,
      commandCount: compoundCommand.commands.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  /**
   * Rollback a transaction
   */
  rollbackTransaction() {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }

    this.inTransaction = false;
    this.transactionCommands = [];

    this.emit('transactionRolledBack', {});
  }

  /**
   * Check if undo is possible
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is possible
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get undo description
   */
  getUndoDescription() {
    if (!this.canUndo()) return '';
    return `Undo: ${this.undoStack[this.undoStack.length - 1].getDescription()}`;
  }

  /**
   * Get redo description
   */
  getRedoDescription() {
    if (!this.canRedo()) return '';
    return `Redo: ${this.redoStack[this.redoStack.length - 1].getDescription()}`;
  }

  /**
   * Get history size
   */
  getHistorySize() {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   */
  getRedoStackSize() {
    return this.redoStack.length;
  }

  /**
   * Clear all history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.transactionCommands = [];

    this.emit('historyCleared', {});
  }

  /**
   * Get command history (for debugging)
   */
  getHistory() {
    return this.undoStack.map((cmd) => cmd.getDescription());
  }

  /**
   * Get redo history (for debugging)
   */
  getRedoHistory() {
    return this.redoStack.map((cmd) => cmd.getDescription());
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
}

/**
 * Compound Command - Groups multiple commands into one
 */
export class CompoundCommand extends Command {
  constructor(commands = [], description = 'Compound Command') {
    super();
    this.commands = commands;
    this.description = description;
  }

  execute() {
    const results = [];
    for (const command of this.commands) {
      results.push(command.execute());
    }
    return results;
  }

  undo() {
    const results = [];
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      results.push(this.commands[i].undo());
    }
    return results;
  }

  getDescription() {
    return this.description;
  }
}

/**
 * G-Code Edit Command - For text editing operations
 */
export class GCodeEditCommand extends Command {
  constructor(editor, startLine, oldText, newText, description = 'Edit') {
    super();
    this.editor = editor;
    this.startLine = startLine;
    this.oldText = oldText;
    this.newText = newText;
    this.description = description;
  }

  execute() {
    // Update editor content
    if (this.editor && typeof this.editor.replaceRange === 'function') {
      this.editor.replaceRange(this.startLine, this.oldText, this.newText);
    }
    return { oldText: this.oldText, newText: this.newText };
  }

  undo() {
    // Restore old text
    if (this.editor && typeof this.editor.replaceRange === 'function') {
      this.editor.replaceRange(this.startLine, this.newText, this.oldText);
    }
    return { oldText: this.newText, newText: this.oldText };
  }

  getDescription() {
    return this.description;
  }
}

/**
 * G-Code Insert Command - For inserting lines
 */
export class GCodeInsertCommand extends Command {
  constructor(editor, lineNumber, content, description = 'Insert') {
    super();
    this.editor = editor;
    this.lineNumber = lineNumber;
    this.content = content;
    this.description = description;
  }

  execute() {
    if (this.editor && typeof this.editor.insertLine === 'function') {
      this.editor.insertLine(this.lineNumber, this.content);
    }
    return { lineNumber: this.lineNumber, content: this.content };
  }

  undo() {
    if (this.editor && typeof this.editor.deleteLine === 'function') {
      this.editor.deleteLine(this.lineNumber);
    }
    return { lineNumber: this.lineNumber };
  }

  getDescription() {
    return this.description;
  }
}

/**
 * G-Code Delete Command - For deleting lines
 */
export class GCodeDeleteCommand extends Command {
  constructor(editor, lineNumber, content, description = 'Delete') {
    super();
    this.editor = editor;
    this.lineNumber = lineNumber;
    this.content = content;
    this.description = description;
  }

  execute() {
    if (this.editor && typeof this.editor.deleteLine === 'function') {
      this.editor.deleteLine(this.lineNumber);
    }
    return { lineNumber: this.lineNumber };
  }

  undo() {
    if (this.editor && typeof this.editor.insertLine === 'function') {
      this.editor.insertLine(this.lineNumber, this.content);
    }
    return { lineNumber: this.lineNumber, content: this.content };
  }

  getDescription() {
    return this.description;
  }
}

/**
 * Mesh Compensation Command - For mesh adjustment operations
 */
export class MeshCompensationCommand extends Command {
  constructor(meshData, oldProbes, newProbes, description = 'Mesh Compensation') {
    super();
    this.meshData = meshData;
    this.oldProbes = oldProbes;
    this.newProbes = newProbes;
    this.description = description;
  }

  execute() {
    if (this.meshData && typeof this.meshData.updateProbes === 'function') {
      this.meshData.updateProbes(this.newProbes);
    }
    return { probesCount: this.newProbes.length };
  }

  undo() {
    if (this.meshData && typeof this.meshData.updateProbes === 'function') {
      this.meshData.updateProbes(this.oldProbes);
    }
    return { probesCount: this.oldProbes.length };
  }

  getDescription() {
    return this.description;
  }
}

/**
 * Tool Library Command - For tool parameter changes
 */
export class ToolLibraryCommand extends Command {
  constructor(toolLibrary, toolId, oldParams, newParams, description = 'Tool Change') {
    super();
    this.toolLibrary = toolLibrary;
    this.toolId = toolId;
    this.oldParams = oldParams;
    this.newParams = newParams;
    this.description = description;
  }

  execute() {
    if (this.toolLibrary && typeof this.toolLibrary.updateTool === 'function') {
      this.toolLibrary.updateTool(this.toolId, this.newParams);
    }
    return { toolId: this.toolId, params: this.newParams };
  }

  undo() {
    if (this.toolLibrary && typeof this.toolLibrary.updateTool === 'function') {
      this.toolLibrary.updateTool(this.toolId, this.oldParams);
    }
    return { toolId: this.toolId, params: this.oldParams };
  }

  getDescription() {
    return this.description;
  }
}

/**
 * Keyboard Shortcuts Manager
 */
export class KeyboardShortcutsManager {
  constructor(historyManager, options = {}) {
    this.historyManager = historyManager;
    this.shortcuts = new Map();
    this.setupDefaultShortcuts();
  }

  /**
   * Setup default keyboard shortcuts
   */
  setupDefaultShortcuts() {
    // Ctrl+Z / Cmd+Z: Undo
    this.registerShortcut(['Control', 'Z'], () => {
      this.historyManager.undo();
    });
    this.registerShortcut(['Meta', 'Z'], () => {
      this.historyManager.undo();
    });

    // Ctrl+Y / Cmd+Shift+Z: Redo
    this.registerShortcut(['Control', 'Y'], () => {
      this.historyManager.redo();
    });
    this.registerShortcut(['Meta', 'Shift', 'Z'], () => {
      this.historyManager.redo();
    });
  }

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(keys, callback) {
    const key = keys.join('+');
    this.shortcuts.set(key, callback);
  }

  /**
   * Handle keydown event
   */
  handleKeyDown(event) {
    const keys = [];

    if (event.ctrlKey) keys.push('Control');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');
    if (event.metaKey) keys.push('Meta');

    keys.push(event.key.toUpperCase());

    const key = keys.join('+');
    const callback = this.shortcuts.get(key);

    if (callback) {
      event.preventDefault();
      callback();
    }
  }

  /**
   * Get registered shortcuts
   */
  getShortcuts() {
    return Array.from(this.shortcuts.keys());
  }

  /**
   * Clear all shortcuts
   */
  clearShortcuts() {
    this.shortcuts.clear();
  }

  /**
   * Attach to element
   */
  attachToElement(element) {
    if (element) {
      element.addEventListener('keydown', (event) => this.handleKeyDown(event));
    }
  }
}

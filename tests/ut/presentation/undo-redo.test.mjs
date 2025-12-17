/**
 * Undo/Redo System Tests
 * Phase 14.2: Undo/Redo Implementation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  Command,
  HistoryManager,
  CompoundCommand,
  GCodeEditCommand,
  GCodeInsertCommand,
  GCodeDeleteCommand,
  MeshCompensationCommand,
  ToolLibraryCommand,
  KeyboardShortcutsManager,
} from '../../../modules/presentation/undo-redo.mjs';

describe('Command Pattern', () => {
  describe('Command Interface', () => {
    test('should define command base class', () => {
      expect(Command).toBeDefined();
    });

    test('should require execute() implementation', () => {
      const cmd = new Command();
      expect(() => cmd.execute()).toThrow('execute() must be implemented');
    });

    test('should require undo() implementation', () => {
      const cmd = new Command();
      expect(() => cmd.undo()).toThrow('undo() must be implemented');
    });

    test('should provide getDescription()', () => {
      const cmd = new Command();
      const desc = cmd.getDescription();
      expect(desc).toBe('Command');
    });
  });

  describe('Custom Command', () => {
    test('should implement execute and undo', () => {
      class TestCommand extends Command {
        constructor() {
          super();
          this.executed = false;
          this.undone = false;
        }

        execute() {
          this.executed = true;
          return 'executed';
        }

        undo() {
          this.undone = true;
          return 'undone';
        }

        getDescription() {
          return 'Test Command';
        }
      }

      const cmd = new TestCommand();
      expect(cmd.execute()).toBe('executed');
      expect(cmd.executed).toBe(true);
      expect(cmd.undo()).toBe('undone');
      expect(cmd.undone).toBe(true);
      expect(cmd.getDescription()).toBe('Test Command');
    });
  });
});

describe('HistoryManager', () => {
  let history;

  beforeEach(() => {
    history = new HistoryManager();
  });

  afterEach(() => {
    history.clear();
  });

  describe('Initialization', () => {
    test('should create with default options', () => {
      expect(history).toBeDefined();
      expect(history.undoStack.length).toBe(0);
      expect(history.redoStack.length).toBe(0);
      expect(history.maxHistorySize).toBe(1000);
    });

    test('should accept custom max history size', () => {
      const customHistory = new HistoryManager({ maxHistorySize: 50 });
      expect(customHistory.maxHistorySize).toBe(50);
    });
  });

  describe('Command Execution', () => {
    test('should execute command and add to undo stack', () => {
      const cmd = createTestCommand();
      history.execute(cmd);

      expect(history.undoStack.length).toBe(1);
      expect(history.undoStack[0]).toBe(cmd);
      expect(cmd.executed).toBe(true);
    });

    test('should reject invalid commands', () => {
      expect(() => history.execute(null)).toThrow();
      expect(() => history.execute({})).toThrow();
    });

    test('should clear redo stack after execution', () => {
      const cmd1 = createTestCommand();
      const cmd2 = createTestCommand();

      history.execute(cmd1);
      history.undo();
      expect(history.canRedo()).toBe(true);

      history.execute(cmd2);
      expect(history.canRedo()).toBe(false);
    });

    test('should enforce max history size', () => {
      const smallHistory = new HistoryManager({ maxHistorySize: 3 });

      for (let i = 0; i < 5; i++) {
        smallHistory.execute(createTestCommand());
      }

      expect(smallHistory.undoStack.length).toBe(3);
    });
  });

  describe('Undo/Redo', () => {
    test('should undo last command', () => {
      const cmd = createTestCommand();
      history.execute(cmd);
      expect(history.canUndo()).toBe(true);

      history.undo();
      expect(cmd.undone).toBe(true);
      expect(history.undoStack.length).toBe(0);
      expect(history.redoStack.length).toBe(1);
    });

    test('should redo last undone command', () => {
      const cmd = createTestCommand();
      history.execute(cmd);
      history.undo();

      expect(history.canRedo()).toBe(true);
      history.redo();

      expect(history.undoStack.length).toBe(1);
      expect(history.redoStack.length).toBe(0);
    });

    test('should return null when cannot undo', () => {
      const result = history.undo();
      expect(result).toBeNull();
    });

    test('should return null when cannot redo', () => {
      const result = history.redo();
      expect(result).toBeNull();
    });

    test('should handle multiple undo/redo cycles', () => {
      const cmd1 = createTestCommand();
      const cmd2 = createTestCommand();

      history.execute(cmd1);
      history.execute(cmd2);

      expect(history.undoStack.length).toBe(2);

      history.undo();
      expect(history.undoStack.length).toBe(1);

      history.undo();
      expect(history.undoStack.length).toBe(0);

      history.redo();
      expect(history.undoStack.length).toBe(1);

      history.redo();
      expect(history.undoStack.length).toBe(2);
    });
  });

  describe('Transactions', () => {
    test('should begin transaction', () => {
      history.beginTransaction();
      expect(history.inTransaction).toBe(true);
    });

    test('should accumulate commands in transaction', () => {
      history.beginTransaction();
      const cmd1 = createTestCommand();
      const cmd2 = createTestCommand();

      history.execute(cmd1);
      history.execute(cmd2);

      expect(history.transactionCommands.length).toBe(2);
      expect(history.undoStack.length).toBe(0); // Not in undo stack yet
    });

    test('should commit transaction as compound command', () => {
      history.beginTransaction();
      const cmd1 = createTestCommand();
      const cmd2 = createTestCommand();

      history.execute(cmd1);
      history.execute(cmd2);

      history.commitTransaction('Batch Edit');

      expect(history.inTransaction).toBe(false);
      expect(history.undoStack.length).toBe(1);
      expect(history.undoStack[0]).toBeInstanceOf(CompoundCommand);
      expect(history.undoStack[0].commands.length).toBe(2);
    });

    test('should undo entire transaction at once', () => {
      history.beginTransaction();
      const cmd1 = createTestCommand();
      const cmd2 = createTestCommand();

      history.execute(cmd1);
      history.execute(cmd2);

      history.commitTransaction();

      history.undo();

      expect(cmd2.undone).toBe(true);
      expect(cmd1.undone).toBe(true);
    });

    test('should rollback transaction', () => {
      history.beginTransaction();
      const cmd1 = createTestCommand();

      history.execute(cmd1);

      expect(history.transactionCommands.length).toBe(1);

      history.rollbackTransaction();

      expect(history.inTransaction).toBe(false);
      expect(history.transactionCommands.length).toBe(0);
      expect(history.undoStack.length).toBe(0);
    });
  });

  describe('State Queries', () => {
    test('should query undo/redo availability', () => {
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);

      const cmd = createTestCommand();
      history.execute(cmd);

      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);

      history.undo();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);
    });

    test('should get undo/redo descriptions', () => {
      expect(history.getUndoDescription()).toBe('');
      expect(history.getRedoDescription()).toBe('');

      const cmd = createTestCommand();
      cmd.getDescription = () => 'Test Operation';

      history.execute(cmd);

      expect(history.getUndoDescription()).toContain('Test Operation');

      history.undo();

      expect(history.getRedoDescription()).toContain('Test Operation');
    });

    test('should report history sizes', () => {
      expect(history.getHistorySize()).toBe(0);
      expect(history.getRedoStackSize()).toBe(0);

      history.execute(createTestCommand());

      expect(history.getHistorySize()).toBe(1);
      expect(history.getRedoStackSize()).toBe(0);

      history.undo();

      expect(history.getHistorySize()).toBe(0);
      expect(history.getRedoStackSize()).toBe(1);
    });
  });

  describe('History Management', () => {
    test('should clear history', () => {
      history.execute(createTestCommand());
      history.execute(createTestCommand());

      history.clear();

      expect(history.undoStack.length).toBe(0);
      expect(history.redoStack.length).toBe(0);
    });

    test('should get history list', () => {
      const cmd1 = createTestCommand();
      const cmd2 = createTestCommand();

      cmd1.getDescription = () => 'First';
      cmd2.getDescription = () => 'Second';

      history.execute(cmd1);
      history.execute(cmd2);

      const historyList = history.getHistory();

      expect(historyList).toEqual(['First', 'Second']);
    });

    test('should get redo history list', () => {
      const cmd1 = createTestCommand();
      const cmd2 = createTestCommand();

      cmd1.getDescription = () => 'First';
      cmd2.getDescription = () => 'Second';

      history.execute(cmd1);
      history.execute(cmd2);

      history.undo();
      history.undo();

      const redoList = history.getRedoHistory();

      expect(redoList).toEqual(['Second', 'First']);
    });
  });

  describe('Events', () => {
    test('should emit commandExecuted event', () => {
      const callback = jest.fn();
      history.addEventListener('commandExecuted', callback);

      history.execute(createTestCommand());

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toHaveProperty('command');
      expect(callback.mock.calls[0][0]).toHaveProperty('canUndo', true);
      expect(callback.mock.calls[0][0]).toHaveProperty('canRedo', false);
    });

    test('should emit commandUndone event', () => {
      const callback = jest.fn();
      history.addEventListener('commandUndone', callback);

      history.execute(createTestCommand());
      history.undo();

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toHaveProperty('command');
    });

    test('should emit commandRedone event', () => {
      const callback = jest.fn();
      history.addEventListener('commandRedone', callback);

      history.execute(createTestCommand());
      history.undo();
      history.redo();

      expect(callback).toHaveBeenCalled();
    });

    test('should emit transactionCommitted event', () => {
      const callback = jest.fn();
      history.addEventListener('transactionCommitted', callback);

      history.beginTransaction();
      history.execute(createTestCommand());
      history.execute(createTestCommand());
      history.commitTransaction();

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toHaveProperty('commandCount', 2);
    });

    test('should support multiple listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      history.addEventListener('commandExecuted', callback1);
      history.addEventListener('commandExecuted', callback2);

      history.execute(createTestCommand());

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should remove event listeners', () => {
      const callback = jest.fn();
      history.addEventListener('commandExecuted', callback);
      history.removeEventListener('commandExecuted', callback);

      history.execute(createTestCommand());

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('CompoundCommand', () => {
  test('should execute all commands', () => {
    const cmd1 = createTestCommand();
    const cmd2 = createTestCommand();
    const compound = new CompoundCommand([cmd1, cmd2], 'Batch');

    const results = compound.execute();

    expect(cmd1.executed).toBe(true);
    expect(cmd2.executed).toBe(true);
    expect(results.length).toBe(2);
  });

  test('should undo all commands in reverse order', () => {
    const cmd1 = createTestCommand();
    const cmd2 = createTestCommand();
    const compound = new CompoundCommand([cmd1, cmd2], 'Batch');

    compound.execute();
    compound.undo();

    expect(cmd2.undone).toBe(true);
    expect(cmd1.undone).toBe(true);
  });

  test('should provide description', () => {
    const compound = new CompoundCommand([], 'Custom Description');
    expect(compound.getDescription()).toBe('Custom Description');
  });
});

describe('GCode Edit Command', () => {
  test('should execute and undo edits', () => {
    const editor = {
      replaceRange: jest.fn(),
    };

    const cmd = new GCodeEditCommand(editor, 1, 'old', 'new', 'Edit Line');

    cmd.execute();
    expect(editor.replaceRange).toHaveBeenCalledWith(1, 'old', 'new');

    cmd.undo();
    expect(editor.replaceRange).toHaveBeenCalledWith(1, 'new', 'old');
  });
});

describe('GCode Insert Command', () => {
  test('should insert and delete lines', () => {
    const editor = {
      insertLine: jest.fn(),
      deleteLine: jest.fn(),
    };

    const cmd = new GCodeInsertCommand(editor, 5, 'G0 X10', 'Insert');

    cmd.execute();
    expect(editor.insertLine).toHaveBeenCalledWith(5, 'G0 X10');

    cmd.undo();
    expect(editor.deleteLine).toHaveBeenCalledWith(5);
  });
});

describe('GCode Delete Command', () => {
  test('should delete and restore lines', () => {
    const editor = {
      insertLine: jest.fn(),
      deleteLine: jest.fn(),
    };

    const cmd = new GCodeDeleteCommand(editor, 5, 'G0 X10', 'Delete');

    cmd.execute();
    expect(editor.deleteLine).toHaveBeenCalledWith(5);

    cmd.undo();
    expect(editor.insertLine).toHaveBeenCalledWith(5, 'G0 X10');
  });
});

describe('Mesh Compensation Command', () => {
  test('should update probes on execute and undo', () => {
    const meshData = {
      updateProbes: jest.fn(),
    };

    const oldProbes = [{ x: 0, y: 0, z: 0 }];
    const newProbes = [{ x: 1, y: 1, z: 1 }];

    const cmd = new MeshCompensationCommand(meshData, oldProbes, newProbes, 'Adjust Mesh');

    cmd.execute();
    expect(meshData.updateProbes).toHaveBeenCalledWith(newProbes);

    cmd.undo();
    expect(meshData.updateProbes).toHaveBeenCalledWith(oldProbes);
  });
});

describe('Tool Library Command', () => {
  test('should update tool on execute and undo', () => {
    const toolLibrary = {
      updateTool: jest.fn(),
    };

    const oldParams = { diameter: 3, feedRate: 100 };
    const newParams = { diameter: 5, feedRate: 150 };

    const cmd = new ToolLibraryCommand(toolLibrary, 'T1', oldParams, newParams, 'Change Tool');

    cmd.execute();
    expect(toolLibrary.updateTool).toHaveBeenCalledWith('T1', newParams);

    cmd.undo();
    expect(toolLibrary.updateTool).toHaveBeenCalledWith('T1', oldParams);
  });
});

describe('Keyboard Shortcuts Manager', () => {
  let history;
  let shortcuts;

  beforeEach(() => {
    history = new HistoryManager();
    shortcuts = new KeyboardShortcutsManager(history);
  });

  describe('Initialization', () => {
    test('should create with default shortcuts', () => {
      const defaultShortcuts = shortcuts.getShortcuts();

      expect(defaultShortcuts.length).toBeGreaterThan(0);
      expect(defaultShortcuts.some((s) => s.includes('Z'))).toBe(true);
    });
  });

  describe('Custom Shortcuts', () => {
    test('should register custom shortcut', () => {
      const callback = jest.fn();
      shortcuts.registerShortcut(['Control', 's'], callback);

      const shortcutsList = shortcuts.getShortcuts();

      expect(shortcutsList.some((s) => s.includes('S'))).toBe(true);
    });

    test('should clear shortcuts', () => {
      shortcuts.clearShortcuts();

      expect(shortcuts.getShortcuts().length).toBe(0);
    });
  });

  describe('Key Handling', () => {
    test('should handle Ctrl+Z for undo', () => {
      history.execute(createTestCommand());

      // Verify the shortcut exists
      const shortcuts = new KeyboardShortcutsManager(history);
      const registeredShortcuts = shortcuts.getShortcuts();
      expect(registeredShortcuts).toContain('Control+Z');

      const event = {
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        key: 'z',
        preventDefault: jest.fn(),
      };

      shortcuts.handleKeyDown(event);

      expect(history.canUndo()).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('should handle Ctrl+Y for redo', () => {
      history.execute(createTestCommand());
      history.undo();

      // Verify the shortcut exists
      const shortcuts = new KeyboardShortcutsManager(history);
      const registeredShortcuts = shortcuts.getShortcuts();
      expect(registeredShortcuts).toContain('Control+Y');

      const event = {
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        key: 'y',
        preventDefault: jest.fn(),
      };

      shortcuts.handleKeyDown(event);

      expect(history.canRedo()).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('should call preventDefault on matched shortcut', () => {
      history.execute(createTestCommand());

      const event = {
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        key: 'z',
        preventDefault: jest.fn(),
      };

      shortcuts.handleKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('should not call preventDefault on unmatched shortcut', () => {
      const event = {
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        key: 'a',
        preventDefault: jest.fn(),
      };

      shortcuts.handleKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});

// Helper function
function createTestCommand() {
  class TestCommand extends Command {
    constructor() {
      super();
      this.executed = false;
      this.undone = false;
    }

    execute() {
      this.executed = true;
      return 'executed';
    }

    undo() {
      this.undone = true;
      return 'undone';
    }

    getDescription() {
      return 'Test Command';
    }
  }

  return new TestCommand();
}

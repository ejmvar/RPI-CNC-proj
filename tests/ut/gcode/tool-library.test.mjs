// Unit tests for tool library

import {
  ToolLibrary,
  DEFAULT_3D_PRINT_TOOLS,
  DEFAULT_CNC_TOOLS,
} from '../../../modules/gcode/tool-library.mjs';

describe('ToolLibrary', () => {
  let library;

  beforeEach(() => {
    library = new ToolLibrary();
  });

  describe('constructor', () => {
    test('creates empty library', () => {
      expect(library.size).toBe(0);
      expect(library.activeTool).toBeNull();
    });
  });

  describe('addTool', () => {
    test('adds tool with all properties', () => {
      library.addTool(0, {
        name: 'Test Tool',
        type: 'endmill',
        diameter: 6.0,
        color: '#ff0000',
      });

      const tool = library.getTool(0);
      expect(tool.name).toBe('Test Tool');
      expect(tool.type).toBe('endmill');
      expect(tool.diameter).toBe(6.0);
      expect(tool.color).toBe('#ff0000');
    });

    test('adds tool with defaults', () => {
      library.addTool(0, {});

      const tool = library.getTool(0);
      expect(tool.name).toBe('Tool 0');
      expect(tool.type).toBe('endmill');
      expect(tool.diameter).toBe(3.0);
    });

    test('generates default color by index', () => {
      library.addTool(0, {});
      library.addTool(1, {});

      expect(library.getTool(0).color).toBe('#ff0000'); // red
      expect(library.getTool(1).color).toBe('#0000ff'); // blue
    });
  });

  describe('selectTool', () => {
    test('selects existing tool', () => {
      library.addTool(0, { name: 'Tool 0' });
      library.addTool(1, { name: 'Tool 1' });

      library.selectTool(1);
      expect(library.activeTool).toBe(1);
      expect(library.getActiveTool().name).toBe('Tool 1');
    });

    test('creates default tool if not found', () => {
      library.selectTool(5);
      expect(library.activeTool).toBe(5);
      expect(library.getTool(5)).toBeDefined();
      expect(library.getTool(5).name).toBe('Tool 5');
    });
  });

  describe('getActiveTool', () => {
    test('returns null when no tool selected', () => {
      expect(library.getActiveTool()).toBeNull();
    });

    test('returns active tool', () => {
      library.addTool(0, { name: 'Active' });
      library.selectTool(0);
      expect(library.getActiveTool().name).toBe('Active');
    });
  });

  describe('removeTool', () => {
    test('removes existing tool', () => {
      library.addTool(0, {});
      expect(library.size).toBe(1);

      const removed = library.removeTool(0);
      expect(removed).toBe(true);
      expect(library.size).toBe(0);
    });

    test('returns false for non-existent tool', () => {
      const removed = library.removeTool(99);
      expect(removed).toBe(false);
    });
  });

  describe('clear', () => {
    test('removes all tools', () => {
      library.addTool(0, {});
      library.addTool(1, {});
      library.selectTool(1);

      library.clear();
      expect(library.size).toBe(0);
      expect(library.activeTool).toBeNull();
    });
  });

  describe('getToolIndices', () => {
    test('returns empty array for empty library', () => {
      expect(library.getToolIndices()).toEqual([]);
    });

    test('returns sorted tool indices', () => {
      library.addTool(2, {});
      library.addTool(0, {});
      library.addTool(1, {});

      expect(library.getToolIndices()).toEqual([0, 1, 2]);
    });
  });

  describe('JSON serialization', () => {
    test('exports to JSON', () => {
      library.addTool(0, { name: 'Tool 0', diameter: 6.0 });
      library.addTool(1, { name: 'Tool 1', diameter: 3.0 });
      library.selectTool(1);

      const json = library.toJSON();
      expect(json.version).toBe('1.0');
      expect(json.activeTool).toBe(1);
      expect(json.tools).toHaveLength(2);
      expect(json.tools[0].name).toBe('Tool 0');
    });

    test('imports from JSON string', () => {
      const jsonStr = JSON.stringify({
        version: '1.0',
        activeTool: 1,
        tools: [
          { index: 0, name: 'Imported 0', diameter: 5.0 },
          { index: 1, name: 'Imported 1', diameter: 4.0 },
        ],
      });

      library.loadFromJSON(jsonStr);
      expect(library.size).toBe(2);
      expect(library.activeTool).toBe(1);
      expect(library.getTool(0).name).toBe('Imported 0');
    });

    test('imports from JSON object', () => {
      const jsonObj = {
        tools: [{ index: 0, name: 'Obj Tool', diameter: 3.0 }],
      };

      library.loadFromJSON(jsonObj);
      expect(library.size).toBe(1);
      expect(library.getTool(0).name).toBe('Obj Tool');
    });
  });

  describe('size property', () => {
    test('returns correct count', () => {
      expect(library.size).toBe(0);
      library.addTool(0, {});
      expect(library.size).toBe(1);
      library.addTool(1, {});
      expect(library.size).toBe(2);
      library.removeTool(0);
      expect(library.size).toBe(1);
    });
  });
});

describe('DEFAULT_3D_PRINT_TOOLS', () => {
  test('contains 3 extruder tools', () => {
    expect(DEFAULT_3D_PRINT_TOOLS).toHaveLength(3);
    DEFAULT_3D_PRINT_TOOLS.forEach((tool) => {
      expect(tool.type).toBe('extruder');
      expect(tool.diameter).toBe(0.4);
    });
  });

  test('has unique colors', () => {
    const colors = DEFAULT_3D_PRINT_TOOLS.map((t) => t.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(colors.length);
  });
});

describe('DEFAULT_CNC_TOOLS', () => {
  test('contains 4 CNC tools', () => {
    expect(DEFAULT_CNC_TOOLS).toHaveLength(4);
  });

  test('has different tool types', () => {
    const types = DEFAULT_CNC_TOOLS.map((t) => t.type);
    expect(types).toContain('endmill');
    expect(types).toContain('drill');
    expect(types).toContain('vbit');
  });

  test('all tools have Z offsets', () => {
    DEFAULT_CNC_TOOLS.forEach((tool) => {
      expect(tool.offsetZ).toBeDefined();
      expect(typeof tool.offsetZ).toBe('number');
    });
  });
});

describe('ToolLibrary - Edge Cases', () => {
  let library;

  beforeEach(() => {
    library = new ToolLibrary();
  });

  describe('addTool edge cases', () => {
    test('overwrites existing tool at same index', () => {
      library.addTool(0, { name: 'First', diameter: 5.0 });
      library.addTool(0, { name: 'Second', diameter: 6.0 });

      const tool = library.getTool(0);
      expect(tool.name).toBe('Second');
      expect(tool.diameter).toBe(6.0);
      expect(library.size).toBe(1);
    });

    test('handles negative tool indices', () => {
      library.addTool(-1, { name: 'Negative' });
      expect(library.getTool(-1).name).toBe('Negative');
      expect(library.size).toBe(1);
    });

    test('handles large tool indices', () => {
      library.addTool(9999, { name: 'Large Index' });
      expect(library.getTool(9999).name).toBe('Large Index');
    });

    test('handles partial config with nullish values', () => {
      library.addTool(0, {
        name: 'Test',
        diameter: null,
        length: undefined,
        offsetZ: 0,
      });

      const tool = library.getTool(0);
      expect(tool.name).toBe('Test');
      // Note: || operator treats null as falsy, but addTool uses ...config last
      // so null overrides the default. This is edge case behavior.
      expect(tool.diameter).toBe(null); // null overrides via spread
      expect(tool.length).toBeUndefined(); // undefined overrides via spread
      expect(tool.offsetZ).toBe(0); // explicit 0
    });

    test('preserves all custom properties', () => {
      library.addTool(0, {
        name: 'Custom',
        type: 'laser',
        diameter: 0.1,
        length: 25.0,
        offsetZ: -5.5,
        color: '#abcdef',
        material: 'Brass',
        feedRate: 1500,
        spindleSpeed: 12000,
        retractDistance: 2.5,
        retractSpeed: 800,
        notes: 'Test notes',
      });

      const tool = library.getTool(0);
      expect(tool.type).toBe('laser');
      expect(tool.diameter).toBe(0.1);
      expect(tool.length).toBe(25.0);
      expect(tool.offsetZ).toBe(-5.5);
      expect(tool.color).toBe('#abcdef');
      expect(tool.material).toBe('Brass');
      expect(tool.feedRate).toBe(1500);
      expect(tool.spindleSpeed).toBe(12000);
      expect(tool.retractDistance).toBe(2.5);
      expect(tool.retractSpeed).toBe(800);
      expect(tool.notes).toBe('Test notes');
    });
  });

  describe('selectTool edge cases', () => {
    test('selecting same tool twice keeps it active', () => {
      library.addTool(0, { name: 'Tool 0' });
      library.selectTool(0);
      library.selectTool(0);
      expect(library.activeTool).toBe(0);
    });

    test('auto-creates tool with correct default name for high indices', () => {
      library.selectTool(42);
      expect(library.getTool(42).name).toBe('Tool 42');
    });

    test('handles negative tool selection', () => {
      library.selectTool(-1);
      expect(library.activeTool).toBe(-1);
      expect(library.getTool(-1)).toBeDefined();
    });
  });

  describe('removeTool edge cases', () => {
    test('removing active tool leaves activeTool set but getActiveTool returns undefined', () => {
      library.addTool(0, {});
      library.selectTool(0);
      library.removeTool(0);

      // activeTool index is still set, but tool no longer exists
      expect(library.activeTool).toBe(0);
      expect(library.getActiveTool()).toBeUndefined();
    });

    test('removing non-active tool keeps activeTool unchanged', () => {
      library.addTool(0, {});
      library.addTool(1, {});
      library.selectTool(0);
      library.removeTool(1);

      expect(library.activeTool).toBe(0);
    });

    test('removing from empty library returns false', () => {
      expect(library.removeTool(0)).toBe(false);
    });
  });

  describe('getTool edge cases', () => {
    test('returns undefined for non-existent tool', () => {
      expect(library.getTool(99)).toBeUndefined();
    });

    test('returns tool after multiple operations', () => {
      library.addTool(0, { name: 'Zero' });
      library.addTool(1, { name: 'One' });
      library.removeTool(0);
      library.addTool(2, { name: 'Two' });

      expect(library.getTool(0)).toBeUndefined();
      expect(library.getTool(1).name).toBe('One');
      expect(library.getTool(2).name).toBe('Two');
    });
  });

  describe('color generation edge cases', () => {
    test('generates different colors for many tools', () => {
      for (let i = 0; i < 20; i++) {
        library.addTool(i, {});
      }

      const colors = [];
      for (let i = 0; i < 20; i++) {
        colors.push(library.getTool(i).color);
      }

      // Check colors are hex format
      colors.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });

      // Most should be unique (color generation wraps after a certain count)
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThan(5);
    });

    test('respects custom color over generated', () => {
      library.addTool(0, { color: '#123456' });
      library.addTool(1, {}); // should generate color
      library.addTool(0, { color: '#abcdef' }); // overwrite

      expect(library.getTool(0).color).toBe('#abcdef');
      expect(library.getTool(1).color).not.toBe('#abcdef');
    });
  });

  describe('JSON edge cases', () => {
    test('handles empty JSON object', () => {
      library.loadFromJSON({});
      expect(library.size).toBe(0);
      expect(library.activeTool).toBeNull();
    });

    test('handles JSON with only activeTool', () => {
      library.loadFromJSON({ activeTool: 5 });
      expect(library.size).toBe(0);
      // activeTool is set from JSON even if no tools exist
      expect(library.activeTool).toBe(5);
    });

    test('handles JSON with empty tools array', () => {
      library.loadFromJSON({ tools: [] });
      expect(library.size).toBe(0);
    });

    test('clears existing tools before loading', () => {
      library.addTool(0, { name: 'Existing' });
      library.addTool(1, { name: 'Also Existing' });

      library.loadFromJSON({
        tools: [{ index: 5, name: 'New Tool' }],
      });

      expect(library.size).toBe(1);
      expect(library.getTool(0)).toBeUndefined();
      expect(library.getTool(5).name).toBe('New Tool');
    });

    test('handles invalid JSON string gracefully', () => {
      expect(() => {
        library.loadFromJSON('not valid json {{{');
      }).toThrow();
    });

    test('exports and re-imports preserving all data', () => {
      library.addTool(0, {
        name: 'Original',
        type: 'drill',
        diameter: 3.5,
        offsetZ: -2.5,
        color: '#ff00ff',
        spindleSpeed: 8000,
      });
      library.addTool(2, { name: 'Another' });
      library.selectTool(0);

      const exported = library.toJSON();
      const newLibrary = new ToolLibrary();
      newLibrary.loadFromJSON(exported);

      expect(newLibrary.size).toBe(2);
      expect(newLibrary.activeTool).toBe(0);
      const tool = newLibrary.getTool(0);
      expect(tool.name).toBe('Original');
      expect(tool.type).toBe('drill');
      expect(tool.diameter).toBe(3.5);
      expect(tool.offsetZ).toBe(-2.5);
      expect(tool.color).toBe('#ff00ff');
      expect(tool.spindleSpeed).toBe(8000);
    });

    test('toJSON creates array with all tools', () => {
      library.addTool(5, { name: 'Five' });
      library.addTool(1, { name: 'One' });
      library.addTool(10, { name: 'Ten' });

      const json = library.toJSON();
      expect(json.tools.length).toBe(3);
      // Map iteration order is insertion order, not sorted
      const indices = json.tools.map((t) => t.index);
      expect(indices).toContain(1);
      expect(indices).toContain(5);
      expect(indices).toContain(10);
    });
  });

  describe('concurrent operations', () => {
    test('handles rapid add/remove cycles', () => {
      for (let i = 0; i < 10; i++) {
        library.addTool(i, { name: `Tool ${i}` });
      }
      for (let i = 0; i < 5; i++) {
        library.removeTool(i);
      }
      for (let i = 0; i < 5; i++) {
        library.addTool(i, { name: `New ${i}` });
      }

      expect(library.size).toBe(10);
      expect(library.getTool(0).name).toBe('New 0');
      expect(library.getTool(7).name).toBe('Tool 7');
    });

    test('handles tool selection during modifications', () => {
      library.addTool(0, {});
      library.selectTool(0);
      library.addTool(1, {});
      library.addTool(0, { name: 'Modified' }); // overwrite active tool
      expect(library.activeTool).toBe(0);
      expect(library.getActiveTool().name).toBe('Modified');
    });
  });
});

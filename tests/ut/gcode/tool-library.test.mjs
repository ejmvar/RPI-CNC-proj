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

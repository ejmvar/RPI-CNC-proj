// Tool library for multi-tool/multi-material CNC and 3D printing
// Manages tool configurations, offsets, and material properties

export class ToolLibrary {
  constructor() {
    this.tools = new Map();
    this.activeTool = null;
  }

  /**
   * Add a tool definition to the library
   * @param {number} index - Tool index (T0, T1, T2, etc.)
   * @param {object} config - Tool configuration
   */
  addTool(index, config) {
    this.tools.set(index, {
      index,
      name: config.name || `Tool ${index}`,
      type: config.type || 'endmill', // 'endmill', 'drill', 'vbit', 'extruder'
      diameter: config.diameter || 3.0, // mm
      length: config.length || 50.0, // mm
      offsetZ: config.offsetZ || 0.0, // Z offset from reference
      color: config.color || this._generateColor(index), // visualization color
      material: config.material || 'HSS', // tool material or filament type
      feedRate: config.feedRate || 100, // default feed rate (mm/min)
      spindleSpeed: config.spindleSpeed || 10000, // RPM (CNC) or temp °C (3D print)
      retractDistance: config.retractDistance || 0, // mm (for extruders)
      retractSpeed: config.retractSpeed || 0, // mm/s (for extruders)
      notes: config.notes || '',
      ...config,
    });
  }

  /**
   * Generate a default color for a tool index
   * @param {number} index - Tool index
   * @returns {string} Hex color code
   */
  _generateColor(index) {
    const colors = [
      '#ff0000', // red
      '#0000ff', // blue
      '#00ff00', // green
      '#ffff00', // yellow
      '#ff00ff', // magenta
      '#00ffff', // cyan
      '#ff8800', // orange
      '#8800ff', // purple
      '#888888', // gray
      '#ffffff', // white
    ];
    return colors[index % colors.length];
  }

  /**
   * Select active tool
   * @param {number} index - Tool index to select
   * @returns {object} Tool configuration
   */
  selectTool(index) {
    if (!this.tools.has(index)) {
      console.warn(`Tool ${index} not defined, using default`);
      this.addTool(index, {});
    }
    this.activeTool = index;
    return this.tools.get(index);
  }

  /**
   * Get current tool configuration
   * @returns {object|null} Active tool config or null
   */
  getActiveTool() {
    if (this.activeTool === null) return null;
    return this.tools.get(this.activeTool);
  }

  /**
   * Get tool by index
   * @param {number} index - Tool index
   * @returns {object|undefined} Tool config or undefined
   */
  getTool(index) {
    return this.tools.get(index);
  }

  /**
   * Remove a tool from the library
   * @param {number} index - Tool index to remove
   * @returns {boolean} True if removed, false if not found
   */
  removeTool(index) {
    return this.tools.delete(index);
  }

  /**
   * Clear all tools
   */
  clear() {
    this.tools.clear();
    this.activeTool = null;
  }

  /**
   * Get all tool indices
   * @returns {number[]} Array of tool indices
   */
  getToolIndices() {
    return Array.from(this.tools.keys()).sort((a, b) => a - b);
  }

  /**
   * Load tool library from JSON
   * @param {string|object} json - JSON string or object
   */
  loadFromJSON(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;

    // Clear existing tools
    this.clear();

    // Load tools
    if (data.tools && Array.isArray(data.tools)) {
      data.tools.forEach((t) => this.addTool(t.index, t));
    }

    // Set active tool if specified
    if (data.activeTool !== undefined) {
      this.activeTool = data.activeTool;
    }
  }

  /**
   * Export tool library as JSON
   * @returns {object} Tool library data
   */
  toJSON() {
    return {
      version: '1.0',
      activeTool: this.activeTool,
      tools: Array.from(this.tools.values()),
    };
  }

  /**
   * Get tool count
   * @returns {number} Number of tools in library
   */
  get size() {
    return this.tools.size;
  }
}

// Default tool configurations for 3D printing
export const DEFAULT_3D_PRINT_TOOLS = [
  {
    index: 0,
    name: 'PLA Red',
    type: 'extruder',
    diameter: 0.4,
    length: 50,
    offsetZ: 0.0,
    color: '#ff0000',
    material: 'PLA',
    feedRate: 50,
    spindleSpeed: 200, // temperature in °C
    retractDistance: 5.0,
    retractSpeed: 40,
    notes: 'Primary extruder for structural parts',
  },
  {
    index: 1,
    name: 'PETG Blue',
    type: 'extruder',
    diameter: 0.4,
    length: 50,
    offsetZ: 0.2,
    color: '#0000ff',
    material: 'PETG',
    feedRate: 40,
    spindleSpeed: 230,
    retractDistance: 6.5,
    retractSpeed: 35,
    notes: 'Secondary extruder for accents',
  },
  {
    index: 2,
    name: 'TPU Black',
    type: 'extruder',
    diameter: 0.4,
    length: 50,
    offsetZ: 0.1,
    color: '#000000',
    material: 'TPU',
    feedRate: 30,
    spindleSpeed: 220,
    retractDistance: 3.0,
    retractSpeed: 25,
    notes: 'Flexible filament',
  },
];

// Default tool configurations for CNC milling
export const DEFAULT_CNC_TOOLS = [
  {
    index: 1,
    name: '6mm End Mill',
    type: 'endmill',
    diameter: 6.0,
    length: 50,
    offsetZ: 0.0,
    color: '#cccccc',
    material: 'HSS',
    feedRate: 800,
    spindleSpeed: 12000,
    notes: 'General purpose roughing',
  },
  {
    index: 2,
    name: '3mm End Mill',
    type: 'endmill',
    diameter: 3.0,
    length: 45,
    offsetZ: -5.0,
    color: '#ffaa00',
    material: 'Carbide',
    feedRate: 600,
    spindleSpeed: 15000,
    notes: 'Finishing and detail work',
  },
  {
    index: 3,
    name: 'V-Bit 90°',
    type: 'vbit',
    diameter: 6.35,
    length: 40,
    offsetZ: -2.5,
    color: '#ff00ff',
    material: 'Carbide',
    feedRate: 600,
    spindleSpeed: 18000,
    notes: 'Engraving and chamfering',
  },
  {
    index: 4,
    name: '3mm Drill',
    type: 'drill',
    diameter: 3.0,
    length: 45,
    offsetZ: -4.0,
    color: '#00ffff',
    material: 'HSS',
    feedRate: 300,
    spindleSpeed: 8000,
    notes: 'Drilling operations',
  },
];

export default { ToolLibrary, DEFAULT_3D_PRINT_TOOLS, DEFAULT_CNC_TOOLS };
